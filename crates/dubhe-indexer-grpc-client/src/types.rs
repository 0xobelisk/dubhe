use serde::{Deserialize, Serialize};



#[derive(Debug, Serialize, Deserialize)]
pub struct Pagination {
    pub total: u64,       
    pub page: u32,        
    pub page_size: u32,    
    pub total_pages: u32, 
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub data: Vec<T>,
    pub pagination: Option<Pagination>,
}