// Tauri commands: multi-provider AI, automatic screen capture, and computer control.

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::process::Command;

// ---------- Screen capture ----------

// Capture the whole screen to a PNG and return the raw bytes.
fn capture_screen_png() -> Result<Vec<u8>, String> {
    let path = std::env::temp_dir().join("ai_screen_capture.png");
    let path_str = path.to_string_lossy().to_string();

    #[cfg(target_os = "linux")]
    {
        // Try gnome-screenshot, then ImageMagick's `import`, then `scrot`.
        let ok = Command::new("gnome-screenshot")
            .args(["-f", &path_str])
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
            || Command::new("scrot")
                .arg(&path_str)
                .status()
                .map(|s| s.success())
                .unwrap_or(false)
            || Command::new("import")
                .args(["-window", "root", &path_str])
                .status()
                .map(|s| s.success())
                .unwrap_or(false);
        if !ok {
            return Err("Screen capture failed. Install gnome-screenshot or scrot.".into());
        }
    }

    #[cfg(target_os = "macos")]
    {
        let ok = Command::new("screencapture")
            .args(["-x", &path_str])
            .status()
            .map(|s| s.success())
            .unwrap_or(false);
        if !ok {
            return Err("Screen capture failed (screencapture).".into());
        }
    }

    #[cfg(target_os = "windows")]
    {
        let ps = format!(
            "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; \
             $b = [System.Windows.Forms.SystemInformation]::VirtualScreen; \
             $bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height); \
             $g = [System.Drawing.Graphics]::FromImage($bmp); \
             $g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size); \
             $bmp.Save('{}'); $g.Dispose(); $bmp.Dispose()",
            path_str.replace('\\', "\\\\")
        );
        let ok = Command::new("powershell")
            .args(["-NoProfile", "-Command", &ps])
            .status()
            .map(|s| s.success())
            .unwrap_or(false);
        if !ok {
            return Err("Screen capture failed (PowerShell).".into());
        }
    }

    std::fs::read(&path).map_err(|e| format!("Could not read screenshot: {e}"))
}

#[derive(Serialize)]
pub struct ScreenshotResult {
    pub success: bool,
    pub message: String,
}

// Manual capture (kept for convenience / testing).
#[tauri::command]
pub async fn screenshot() -> Result<ScreenshotResult, String> {
    capture_screen_png()?;
    Ok(ScreenshotResult {
        success: true,
        message: "Screenshot captured".into(),
    })
}

// ---------- AI (multi-provider) ----------

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AskRequest {
    pub question: String,
    pub provider: String, // "claude" | "openai" | "gemini"
    pub api_key: String,
    pub model: String,
    #[serde(default)]
    pub capture_screen: bool,
}

#[derive(Serialize)]
pub struct AIResponse {
    pub success: bool,
    pub response: String,
}

// Ask the selected AI provider a question. If capture_screen is true, the app
// grabs the screen itself and sends it along — the user never uploads anything.
#[tauri::command]
pub async fn ask(request: AskRequest) -> Result<AIResponse, String> {
    let image_b64 = if request.capture_screen {
        match capture_screen_png() {
            Ok(bytes) => Some(STANDARD.encode(bytes)),
            Err(e) => {
                // Don't fail the whole request if capture fails; answer text-only.
                eprintln!("screen capture warning: {e}");
                None
            }
        }
    } else {
        None
    };

    let text = match request.provider.as_str() {
        "openai" => ask_openai(&request, image_b64.as_deref()).await?,
        "gemini" => ask_gemini(&request, image_b64.as_deref()).await?,
        _ => ask_claude(&request, image_b64.as_deref()).await?,
    };

    Ok(AIResponse {
        success: true,
        response: text,
    })
}

async fn ask_claude(req: &AskRequest, image_b64: Option<&str>) -> Result<String, String> {
    let mut content = vec![serde_json::json!({ "type": "text", "text": req.question })];
    if let Some(b64) = image_b64 {
        content.push(serde_json::json!({
            "type": "image",
            "source": { "type": "base64", "media_type": "image/png", "data": b64 }
        }));
    }
    let body = serde_json::json!({
        "model": req.model,
        "max_tokens": 1024,
        "messages": [{ "role": "user", "content": content }]
    });

    let resp = reqwest::Client::new()
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &req.api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if let Some(err) = json.get("error") {
        return Err(err["message"].as_str().unwrap_or("Claude API error").to_string());
    }
    Ok(json["content"][0]["text"].as_str().unwrap_or("No response").to_string())
}

async fn ask_openai(req: &AskRequest, image_b64: Option<&str>) -> Result<String, String> {
    let mut content = vec![serde_json::json!({ "type": "text", "text": req.question })];
    if let Some(b64) = image_b64 {
        content.push(serde_json::json!({
            "type": "image_url",
            "image_url": { "url": format!("data:image/png;base64,{b64}") }
        }));
    }
    let body = serde_json::json!({
        "model": req.model,
        "max_tokens": 1024,
        "messages": [{ "role": "user", "content": content }]
    });

    let resp = reqwest::Client::new()
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", req.api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if let Some(err) = json.get("error") {
        return Err(err["message"].as_str().unwrap_or("OpenAI API error").to_string());
    }
    Ok(json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("No response")
        .to_string())
}

async fn ask_gemini(req: &AskRequest, image_b64: Option<&str>) -> Result<String, String> {
    let mut parts = vec![serde_json::json!({ "text": req.question })];
    if let Some(b64) = image_b64 {
        parts.push(serde_json::json!({
            "inline_data": { "mime_type": "image/png", "data": b64 }
        }));
    }
    let body = serde_json::json!({ "contents": [{ "parts": parts }] });

    // Authenticate with the x-goog-api-key header (works for both the legacy
    // AIza... keys and the new AQ.... auth keys). The old ?key= query param is
    // rejected for the new-format keys.
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
        req.model
    );
    let resp = reqwest::Client::new()
        .post(&url)
        .header("x-goog-api-key", &req.api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if let Some(err) = json.get("error") {
        let msg = err["message"].as_str().unwrap_or("Gemini API error");
        let lower = msg.to_lowercase();
        if lower.contains("quota") || lower.contains("exhausted") || lower.contains("limit: 0") {
            return Err("Your Google account has no Gemini quota (free-tier limit is 0). \
                        Switch to Claude or OpenAI in Settings, or enable billing on your \
                        Google Cloud project."
                .to_string());
        }
        return Err(msg.to_string());
    }
    Ok(json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("No response")
        .to_string())
}

// Open a URL in the user's default web browser.
#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let res = Command::new("cmd").args(["/C", "start", "", &url]).spawn();
    #[cfg(target_os = "macos")]
    let res = Command::new("open").arg(&url).spawn();
    #[cfg(target_os = "linux")]
    let res = Command::new("xdg-open").arg(&url).spawn();

    res.map(|_| ()).map_err(|e| e.to_string())
}

// ---------- Computer control ----------

// Run a terminal/shell command so the app can control the computer.
#[tauri::command]
pub async fn run_command(command: String) -> Result<String, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd").args(["/C", &command]).output()
    } else {
        Command::new("sh").args(["-c", &command]).output()
    }
    .map_err(|e| e.to_string())?;

    let mut out = String::from_utf8_lossy(&output.stdout).to_string();
    let err = String::from_utf8_lossy(&output.stderr);
    if !err.is_empty() {
        out.push_str("\n");
        out.push_str(&err);
    }
    Ok(out)
}

#[derive(Deserialize)]
pub struct MouseControl {
    pub x: i32,
    pub y: i32,
    pub button: String,
    pub action: String, // "move" | "click"
}

#[tauri::command]
pub async fn control_mouse(control: MouseControl) -> Result<String, String> {
    #[cfg(target_os = "linux")]
    {
        match control.action.as_str() {
            "move" => {
                Command::new("xdotool")
                    .args(["mousemove", &control.x.to_string(), &control.y.to_string()])
                    .output()
                    .map_err(|e| e.to_string())?;
            }
            "click" => {
                let button = match control.button.as_str() {
                    "right" => "3",
                    "middle" => "2",
                    _ => "1",
                };
                Command::new("xdotool")
                    .args(["mousemove", &control.x.to_string(), &control.y.to_string(), "click", button])
                    .output()
                    .map_err(|e| e.to_string())?;
            }
            _ => {}
        }
    }
    let _ = &control; // used on all platforms
    Ok("ok".into())
}

#[derive(Deserialize)]
pub struct KeyboardControl {
    pub action: String, // "type" | "press"
    pub text: Option<String>,
    pub keys: Vec<String>,
}

#[tauri::command]
pub async fn control_keyboard(control: KeyboardControl) -> Result<String, String> {
    #[cfg(target_os = "linux")]
    {
        match control.action.as_str() {
            "type" => {
                if let Some(text) = &control.text {
                    Command::new("xdotool").args(["type", text]).output().map_err(|e| e.to_string())?;
                }
            }
            "press" => {
                for key in &control.keys {
                    Command::new("xdotool").args(["key", key]).output().map_err(|e| e.to_string())?;
                }
            }
            _ => {}
        }
    }
    let _ = &control;
    Ok("ok".into())
}

#[tauri::command]
pub async fn get_window_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    }))
}
