use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::Serialize;
use std::collections::HashMap;
use base64::{Engine as _, alphabet, engine::{self, GeneralPurpose}};

#[derive(Serialize)]
struct ApiResponse {
    status: u16,
    headers: HashMap<String, String>,
    body: String,  // Text or base64-encoded binary
    is_base64: bool,
}

#[tauri::command]
pub async fn fetch_from_api(
	url: String,
	method: String,
	body: Option<String>,
	headers: Option<Vec<(String, String)>>,
  redirect: Option<String>,
  referrer: Option<String>,
  is_body_binary: Option<bool>
) -> Result<String, String> {
    let mut client_builder = reqwest::Client::builder();

    // Handle redirect: 'manual' disables auto-follow
    if let Some(r) = redirect {
        if r == "manual" {
            client_builder = client_builder.redirect(reqwest::redirect::Policy::none());
        }
    }

    let client = client_builder.build().map_err(|e| e.to_string())?;
    let mut req = client.request(method.parse().unwrap(), &url);

    // Handle referrer as header
    if let Some(ref_str) = referrer {
        req = req.header("Referer", ref_str);
    }

    if let Some(b) = body {
        if is_body_binary.unwrap_or(false) {
            let decoded = base64::decode(b).map_err(|e| e.to_string())?;
            req = req.body(decoded);
        } else {
            req = req.body(b);
        }
    }

    if let Some(h) = headers {
        let mut header_map = HeaderMap::new();
        for (key, val) in h {
            if let Ok(name) = HeaderName::from_bytes(key.as_bytes()) {
                if let Ok(value) = HeaderValue::from_str(&val) {
                    header_map.insert(name, value);
                }
            }
        }
        req = req.headers(header_map);
    }

    match req.send().await {
        Ok(resp) => {
            let status = resp.status().as_u16();
            let mut resp_headers: HashMap<String, String> = HashMap::new();
            for (name, value) in resp.headers() {
                if let (Some(n), Ok(v)) = (name.as_str().to_lowercase().into(), value.to_str()) {
                    resp_headers.insert(n, v.to_string());
                }
            }
            let content_type = resp_headers.get("content-type").cloned().unwrap_or_default().to_lowercase();
            let is_text = content_type.starts_with("text/") || content_type.starts_with("application/json") || content_type.is_empty();
            let body_str: String;
            let mut is_base64 = false;
            if is_text {
                body_str = resp.text().await.unwrap_or_default();
            } else {
                let bytes = resp.bytes().await.unwrap_or_default();
                let engine = GeneralPurpose::new(&alphabet::STANDARD, engine::general_purpose::PAD);
                body_str = engine.encode(bytes);
                is_base64 = true;
            }

            let api_resp = ApiResponse {
                status,
                headers: resp_headers,
                body: body_str,
                is_base64,
            };

            match serde_json::to_string(&api_resp) {
                Ok(json) => Ok(json),
                Err(e) => Err(format!("Serialization error: {}", e)),
            }
        }
        Err(e) => Err(e.to_string()),
    }
}
