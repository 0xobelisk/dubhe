# Dubhe NextJS Template Upgrade Notes

## Overview
This document outlines the major improvements made to the NextJS template based on the latest patterns from the 101 template.

## Major Updates

### 1. New Dependencies Added
- `@0xobelisk/graphql-client`: Advanced GraphQL client for data querying and subscriptions
- `@0xobelisk/ecs`: Entity Component System world client for game-oriented data management
- `viem`: Updated blockchain library for enhanced transaction handling

### 2. New Architecture Components

#### useContract Hook (`src/app/dubhe/useContract.ts`)
- Centralized contract management with optimized caching
- Integrated GraphQL client initialization
- ECS World setup with batch optimization
- Automatic reconnection on errors
- Configurable query timeouts and debouncing

### 3. Enhanced Query Logic

#### Dual Client System
- **ECS Client**: Optimized for game development with component-based architecture
- **GraphQL Client**: Universal data access with flexible query capabilities

#### Real-time Features
- Live subscriptions to data changes
- Automatic UI updates when transactions complete
- Error handling and reconnection logic

### 4. Improved User Interface

#### Tab-based Navigation
- Switch between ECS and GraphQL clients
- Visual indicators for recommended approaches
- Responsive design with modern styling

#### Advanced Data Querying
- Component data exploration with entity browsing
- Resource data querying with filtering
- Table data inspection with field information
- Real-time data count display

#### Enhanced UX Features
- Loading states for all operations
- Comprehensive error handling
- Transaction success notifications with explorer links
- Detailed logging for debugging

### 5. Performance Optimizations
- Memoized client instances to prevent unnecessary re-renders
- Batch query optimization for ECS operations
- Debounced subscriptions to prevent spam
- Cached component and resource data

## Usage Instructions

1. **Install Dependencies**: The new dependencies are already added to package.json
2. **Environment Setup**: Configure GraphQL endpoints in your environment variables:
   ```
   NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:4000/graphql
   NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT=ws://localhost:4000/graphql
   ```
3. **Development**: The application now provides two separate client interfaces - use the ECS client for game development scenarios and GraphQL client for general data access.

## Migration Notes

- The old query logic has been completely replaced with the new dual-client system
- All existing functionality is preserved but with improved performance and capabilities
- The UI is now more comprehensive and provides better developer experience
- Real-time subscriptions are now available out of the box

## Benefits

1. **Better Performance**: Optimized queries and caching reduce unnecessary network calls
2. **Enhanced Developer Experience**: Rich UI provides better insight into data structures
3. **Future-Proof**: Modern architecture supports both current and upcoming features
4. **Flexibility**: Choice between ECS and GraphQL clients based on use case
5. **Reliability**: Improved error handling and automatic reconnection features

## Next Steps

- Test the new functionality in your development environment
- Explore the component and resource querying features
- Utilize the real-time subscription capabilities for your application
- Consider migrating existing query logic to use the new patterns
