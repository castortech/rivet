use flate2::read::GzDecoder;
use std::fs::File;
use std::path::Path;
use tar::Archive;
use tauri::InvokeError;

#[tauri::command]
pub fn extract_package_plugin_tarball(path: &str) -> Result<(), InvokeError> {
    let tar_gz = File::open(path).map_err(|e| InvokeError::from(e.to_string()))?;
    let tar = GzDecoder::new(tar_gz);
    let mut archive = Archive::new(tar);

    let dir = Path::new(path).parent().unwrap();
    archive
        .unpack(dir)
        .map_err(|e| InvokeError::from(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[tauri::command]
pub fn is_admin() -> Result<bool, String> {
    use windows::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
    use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    unsafe {
        let mut token = windows::Win32::Foundation::HANDLE::default();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token).is_err() {
            return Err("Failed to open process token".to_string());
        }

        let mut elevation = TOKEN_ELEVATION::default();
        let mut size = std::mem::size_of::<TOKEN_ELEVATION>() as u32;
        if GetTokenInformation(token, TokenElevation, Some(&mut elevation as *mut _ as *mut _), size, &mut size).is_err() {
            return Err("Failed to get token info".to_string());
        }

        Ok(elevation.TokenIsElevated != 0)
    }
}