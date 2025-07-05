import type { DynamicTable } from './database-introspector';

export interface WelcomePageConfig {
  port: string | number;
  graphqlEndpoint: string;
  nodeEnv: string;
  schema: string;
  enableCors: string;
  enableSubscriptions: string;
}

// Create custom welcome page
export function createWelcomePage(tables: DynamicTable[], config: WelcomePageConfig): string {
  const { port, graphqlEndpoint, nodeEnv, schema, enableCors, enableSubscriptions } = config;

  const tableList = tables
    .map((table) => {
      const keyFields = table.fields.filter((f) => f.is_key).map((f) => f.field_name);
      const valueFields = table.fields.filter((f) => !f.is_key).map((f) => f.field_name);
      return `
			<div class="table-info">
				<h3>📊 ${table.table_name}</h3>
				<div class="fields">
					<div><strong>Key Fields:</strong> ${keyFields.join(', ') || 'None'}</div>
					<div><strong>Value Fields:</strong> ${valueFields.join(', ')}</div>
				</div>
			</div>
		`;
    })
    .join('');

  return `
		<!DOCTYPE html>
		<html>
			<head>
				<title>🚀 Sui Indexer GraphQL API</title>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1">
				<style>
					body { 
						font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
						margin: 0; 
						padding: 20px; 
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						color: #333;
						min-height: 100vh;
					}
					.container { 
						max-width: 1200px; 
						margin: 0 auto; 
						background: white; 
						padding: 40px; 
						border-radius: 16px; 
						box-shadow: 0 20px 40px rgba(0,0,0,0.1);
					}
					h1 { 
						color: #2c3e50; 
						text-align: center; 
						margin-bottom: 10px; 
						font-size: 2.5em;
					}
					.subtitle {
						text-align: center;
						color: #7f8c8d;
						margin-bottom: 40px;
						font-size: 1.2em;
					}
					.link { 
						display: inline-block; 
						margin: 10px; 
						padding: 15px 25px; 
						background: linear-gradient(135deg, #74b9ff, #0984e3); 
						color: white; 
						text-decoration: none; 
						border-radius: 8px; 
						text-align: center; 
						font-weight: 500;
						transition: transform 0.2s ease;
					}
					.link:hover { 
						transform: translateY(-2px);
						box-shadow: 0 8px 15px rgba(116, 185, 255, 0.4);
					}
					.status { 
						color: #00b894; 
						font-weight: bold; 
						text-align: center;
						font-size: 1.1em;
						margin: 20px 0;
					}
					.warning {
						background: #ffeaa7;
						border-left: 4px solid #fdcb6e;
						padding: 15px;
						margin: 20px 0;
						border-radius: 4px;
					}
					.warning h4 {
						margin-top: 0;
						color: #e17055;
					}
					.table-info {
						background: #f8f9fa;
						padding: 20px;
						margin: 15px 0;
						border-radius: 8px;
						border-left: 4px solid #74b9ff;
					}
					.table-info h3 {
						margin: 0 0 10px 0;
						color: #2c3e50;
					}
					.fields div {
						margin: 5px 0;
						color: #555;
					}
					.info-grid {
						display: grid;
						grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
						gap: 20px;
						margin: 30px 0;
					}
					.info-card {
						background: #f8f9fa;
						padding: 20px;
						border-radius: 8px;
						border: 1px solid #e9ecef;
					}
					.info-card h3 {
						color: #495057;
						margin-top: 0;
					}
					.center {
						text-align: center;
					}
					.highlight {
						background: linear-gradient(135deg, #fdcb6e, #e17055);
						color: white;
						padding: 2px 8px;
						border-radius: 4px;
						font-weight: 500;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<h1>🚀 Sui Indexer GraphQL API</h1>
					<p class="subtitle">Dynamically scan database, automatically generate GraphQL API</p>
					<p class="status">● Server Status: Running Normally | Scanned <span class="highlight">${
            tables.length
          }</span> tables</p>
					
					${
            enableSubscriptions === 'false'
              ? `
					<div class="warning">
						<h4>⚠️ WebSocket subscription feature is temporarily disabled</h4>
						<p>Currently fixing subscription configuration issues. Basic GraphQL query and mutation functions work perfectly.</p>
					</div>
					`
              : `
					<div class="status">
						<p>📡 Real-time subscription feature: ${enableSubscriptions === 'true' ? 'Enabled' : 'Disabled'}</p>
					</div>
					`
          }
					
					<div class="center">
						<a href="${graphqlEndpoint}" class="link">📊 GraphQL API</a>
						<a href="/playground" class="link">🎮 Enhanced GraphQL Playground</a>
					</div>

					<div class="info-grid">
						<div class="info-card">
							<h3>🎯 Core Features</h3>
							<ul>
								<li>✨ Auto-scan sui-rust-indexer database</li>
								<li>🔄 Dynamically generate GraphQL schema</li>
								<li>📡 Support real-time subscription features ${enableSubscriptions === 'true' ? '✅' : '⚠️'}</li>
								<li>🚀 Complete CRUD operations</li>
								<li>🛡️ PostGraphile powerful features</li>
							</ul>
						</div>
						
						<div class="info-card">
							<h3>📊 Server Information</h3>
							<ul>
								<li>Environment: ${nodeEnv}</li>
								<li>Port: ${port}</li>
								<li>Database Schema: ${schema}</li>
								<li>CORS: ${enableCors === 'true' ? 'Enabled' : 'Disabled'}</li>
								<li>Subscriptions: ${enableSubscriptions === 'true' ? 'Enabled' : 'Disabled'}</li>
							</ul>
						</div>
					</div>

					<h2>📋 Detected Data Tables</h2>
					${tableList}
					
					<div style="margin-top: 40px; padding: 20px; background: #e3f2fd; border-radius: 8px;">
						<h3>💡 Usage Tips</h3>
						<p>1. Visit <strong>Enhanced GraphQL Playground</strong> for better query experience</p>
						<p>   • 📊 Visual Schema Explorer - Click-to-build queries</p>
						<p>   • 🎨 Modern UI interface and enhanced code highlighting</p>
						<p>   • 📝 Code export feature - Generate client code in multiple languages</p>
						<p>   • ⌨️ Keyboard shortcuts support - Ctrl/Cmd+Enter to execute queries</p>
						<p>2. All tables support standard GraphQL query, mutation${
              enableSubscriptions === 'true' ? ' and subscription' : ''
            } operations</p>
						<p>3. Dynamic tables (store_*) automatically generate fields based on table_fields metadata</p>
						<p>4. System tables provide core data access for dubhe-indexer</p>
						${enableSubscriptions === 'true' ? '<p>5. Use WebSocket for real-time data subscriptions</p>' : ''}
					</div>
				</div>
			</body>
		</html>
	`;
}
