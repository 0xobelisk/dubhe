# API Documentation

This directory contains comprehensive API documentation for the Dubhe project.

## 📚 API Overview

Dubhe provides a comprehensive set of APIs for blockchain development across multiple platforms:

### Supported Platforms

- **Sui**: Sui blockchain integration
- **Aptos**: Aptos blockchain integration
- **Initia**: Initia blockchain integration
- **Rooch**: Rooch blockchain integration

### API Categories

- **CLI APIs**: Command-line interface APIs
- **Client APIs**: Programmatic client libraries
- **GraphQL APIs**: GraphQL server and client APIs
- **REST APIs**: RESTful service APIs

## 🗂️ Documentation Structure

```
docs/api/
├── README.md                 # This file
├── cli/                      # CLI API documentation
│   ├── sui-cli.md           # Sui CLI API reference
│   ├── aptos-cli.md         # Aptos CLI API reference
│   ├── initia-cli.md        # Initia CLI API reference
│   └── rooch-cli.md         # Rooch CLI API reference
├── client/                   # Client library documentation
│   ├── sui-client.md        # Sui client API reference
│   ├── aptos-client.md      # Aptos client API reference
│   ├── initia-client.md     # Initia client API reference
│   └── rooch-client.md      # Rooch client API reference
├── graphql/                  # GraphQL API documentation
│   ├── schema.md            # GraphQL schema reference
│   ├── queries.md           # Query examples
│   ├── mutations.md         # Mutation examples
│   └── subscriptions.md     # Subscription examples
├── rest/                     # REST API documentation
│   ├── endpoints.md         # REST endpoint reference
│   ├── authentication.md    # Authentication guide
│   └── examples.md          # REST API examples
└── examples/                 # API usage examples
    ├── typescript/          # TypeScript examples
    ├── javascript/          # JavaScript examples
    └── curl/                # cURL examples
```

## 🔧 API Development

### Generating API Documentation

```bash
# Generate TypeDoc documentation
pnpm docs:generate

# Generate OpenAPI/Swagger specs
pnpm docs:swagger

# Generate GraphQL schema documentation
pnpm docs:graphql
```

### API Testing

```bash
# Run API tests
pnpm test:api

# Run API integration tests
pnpm test:api:integration

# Run API performance tests
pnpm test:api:performance
```

## 📖 Documentation Standards

### Code Examples

All API documentation should include:

- **TypeScript examples** for client libraries
- **JavaScript examples** for broader compatibility
- **cURL examples** for REST APIs
- **GraphQL examples** for GraphQL APIs

### Documentation Format

- **Markdown format** for all documentation
- **OpenAPI 3.0** specification for REST APIs
- **GraphQL SDL** for GraphQL schemas
- **TypeDoc** for TypeScript documentation

### Versioning

- **Semantic versioning** for API versions
- **Changelog** for each API version
- **Migration guides** for breaking changes
- **Deprecation notices** for deprecated features

## 🌐 API Endpoints

### Base URLs

- **Development**: `http://localhost:3000/api`
- **Staging**: `https://staging-api.dubhe.dev`
- **Production**: `https://api.dubhe.dev`

### Authentication

- **API Keys**: Required for all authenticated endpoints
- **JWT Tokens**: For user-specific operations
- **OAuth 2.0**: For third-party integrations

### Rate Limiting

- **Free Tier**: 100 requests/hour
- **Pro Tier**: 10,000 requests/hour
- **Enterprise**: Custom limits

## 🔍 API Reference

### CLI APIs

- [Sui CLI API](./cli/sui-cli.md)
- [Aptos CLI API](./cli/aptos-cli.md)
- [Initia CLI API](./cli/initia-cli.md)
- [Rooch CLI API](./cli/rooch-cli.md)

### Client Libraries

- [Sui Client API](./client/sui-client.md)
- [Aptos Client API](./client/aptos-client.md)
- [Initia Client API](./client/initia-client.md)
- [Rooch Client API](./client/rooch-client.md)

### GraphQL APIs

- [GraphQL Schema](./graphql/schema.md)
- [GraphQL Queries](./graphql/queries.md)
- [GraphQL Mutations](./graphql/mutations.md)
- [GraphQL Subscriptions](./graphql/subscriptions.md)

### REST APIs

- [REST Endpoints](./rest/endpoints.md)
- [Authentication](./rest/authentication.md)
- [API Examples](./rest/examples.md)

## 🚀 Getting Started

### Quick Start

```bash
# Install Dubhe CLI
npm install -g @0xobelisk/dubhe-cli

# Initialize a new project
dubhe init my-project

# Start development server
cd my-project && dubhe dev
```

### API Examples

```typescript
// Sui Client Example
import { SuiClient } from '@0xobelisk/sui-client';

const client = new SuiClient({
  url: 'https://fullnode.testnet.sui.io:443',
});

const balance = await client.getBalance({
  owner: '0x...',
});
```

```graphql
# GraphQL Query Example
query GetTransaction($id: ID!) {
  transaction(id: $id) {
    id
    timestamp
    status
    effects {
      status
      gasUsed
    }
  }
}
```

## 📊 API Status

### Health Check

```bash
# Check API health
curl https://api.dubhe.dev/health

# Check specific service health
curl https://api.dubhe.dev/health/sui
curl https://api.dubhe.dev/health/aptos
```

### Status Page

- **Status Page**: [status.dubhe.dev](https://status.dubhe.dev)
- **Uptime**: 99.9% SLA
- **Response Time**: < 200ms (95th percentile)

## 🛠️ API Tools

### Interactive Documentation

- **Swagger UI**: [api.dubhe.dev/docs](https://api.dubhe.dev/docs)
- **GraphQL Playground**: [api.dubhe.dev/graphql](https://api.dubhe.dev/graphql)
- **Postman Collection**: [Download Postman Collection](./postman-collection.json)

### SDKs and Libraries

- **TypeScript/JavaScript**: `@0xobelisk/sui-client`
- **Python**: `dubhe-python-sdk`
- **Go**: `dubhe-go-sdk`
- **Rust**: `dubhe-rust-sdk`

## 📞 Support

### API Support

- **Documentation**: [docs.dubhe.dev](https://docs.dubhe.dev)
- **Community**: [Discord](https://discord.gg/dubhe)
- **Issues**: [GitHub Issues](https://github.com/0xobelisk/dubhe/issues)
- **Email**: api-support@dubhe.dev

### Rate Limits and Quotas

- **Free Tier**: 100 requests/hour
- **Pro Tier**: 10,000 requests/hour
- **Enterprise**: Custom limits and dedicated support

## 🔗 Related Documentation

- [Getting Started Guide](./../getting-started/)
- [Component Guide](./../COMPONENT_GUIDE.md)
- [Engineering Architecture](./../ENGINEERING.md)
- [Security Policy](./../security/security-policy.md)
