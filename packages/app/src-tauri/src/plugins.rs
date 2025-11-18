use flate2::read::GzDecoder;
use std::fs::File;
use std::path::Path;
use std::process::Command;
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
    if cfg!(not(target_os = "windows")) {
        return Ok(true)
    }

    match Command::new("net")
        .arg("session")
        .output() {
        Ok(output) => Ok(output.status.success()),
        Err(e) => Err(e.to_string()),
    }
}