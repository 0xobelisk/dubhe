module obelisk::resource_tyeps {

    public fun schema() : vector<u8> {
        b"sc"
    }

    public fun offchain_schema() : vector<u8> {
        b"os"
    }

    public fun system() : vector<u8> {
        b"sy"
    }

    public fun namespace() : vector<u8> {
        b"ns"
    }
}