module dubhe::dapp_metadata;
use std::ascii::String;

/// Dapp metadata structure
public struct DappMetadata has copy, drop, store {
    name: String,
    description: String,
    website_url: String,
    cover_url: vector<String>,
    partners: vector<String>,
    package_ids: vector<address>,
    created_at: u64,
    admin: address,
    version: u32,
    pausable: bool
}

public fun new(
    name: String,
    description: String,
    website_url: String,
    cover_url: vector<String>,
    partners: vector<String>,
    package_ids: vector<address>,
    created_at: u64,
    admin: address,
    version: u32,
    pausable: bool
): DappMetadata {
    DappMetadata {
        name,
        description,
        website_url,
        cover_url,
        partners,
        package_ids,
        created_at,
        admin,
        version,
        pausable
    }
}

/// Get and set functions
public fun get_name(self: &DappMetadata): String {
    self.name
}

public fun get_description(self: &DappMetadata): String {
    self.description
}

public fun get_website_url(self: &DappMetadata): String {
    self.website_url
}

public fun get_cover_url(self: &DappMetadata): vector<String> {
    self.cover_url
}

public fun get_partners(self: &DappMetadata): vector<String> {
    self.partners
}

public fun get_package_ids(self: &DappMetadata): vector<address> {
    self.package_ids
}

public fun get_created_at(self: &DappMetadata): u64 {
    self.created_at
}

public fun get_admin(self: &DappMetadata): address {
    self.admin
}

public fun get_version(self: &DappMetadata): u32 {
    self.version
}

public fun get_pausable(self: &DappMetadata): bool {
    self.pausable
}

public(package) fun set_name(self: &mut DappMetadata, name: String) {
    self.name = name;
}

public(package) fun set_description(self: &mut DappMetadata, description: String) {
    self.description = description;
}

public(package) fun set_website_url(self: &mut DappMetadata, website_url: String) {
    self.website_url = website_url;
}

public(package) fun set_cover_url(self: &mut DappMetadata, cover_url: vector<String>) {
    self.cover_url = cover_url;
}

public(package) fun set_partners(self: &mut DappMetadata, partners: vector<String>) {
    self.partners = partners;
}

public(package) fun set_package_ids(self: &mut DappMetadata, package_ids: vector<address>) {
    self.package_ids = package_ids;
}

public(package) fun set_created_at(self: &mut DappMetadata, created_at: u64) {
    self.created_at = created_at;
}

public(package) fun set_admin(self: &mut DappMetadata, admin: address) {
    self.admin = admin;
}

public(package) fun set_version(self: &mut DappMetadata, version: u32) {
    self.version = version;
}

public(package) fun set_pausable(self: &mut DappMetadata, pausable: bool) {
    self.pausable = pausable;
}