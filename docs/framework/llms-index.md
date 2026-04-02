# Dubhe Framework — Developer Reference (LLM Index)

> Internal documentation for contributors working on the Dubhe framework itself.
> Read this index first, then open the specific page you need.

## Pages

- [Architecture](./architecture.md): Module structure, layer responsibilities, and the three-tier storage model (DappHub / DappStorage / UserStorage). Start here to understand how the framework is organised.

- [Codegen Pipeline](./codegen-pipeline.md): How `dubhe.config.ts` drives `schemagen` to produce Move code. Covers which files are generated, how to add errors/resources, and what must never be edited by hand.

- [Security Patterns](./security-patterns.md): UserStorage ownership model (CVE-D-02 prevention), Ownable2Step ownership transfer, Lazy Settlement fee model, and proxy security. Read before touching any storage or admin logic.

- [Upgrade Guide](./upgrade.md): Framework upgrade procedure for the framework admin. Covers version constants, breaking vs compatible upgrades, `migrate::run` internals, governance (Ownable2Step, two-step treasury), and the `max_unsettled_writes` constantization breaking change.
