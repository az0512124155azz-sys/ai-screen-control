// AI Screen Control - Tauri 2 backend entry point
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
use commands::{
    ask, control_keyboard, control_mouse, get_window_info, open_url, run_command, screenshot,
};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ask,
            screenshot,
            open_url,
            run_command,
            control_mouse,
            control_keyboard,
            get_window_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running AI Screen Control");
}
