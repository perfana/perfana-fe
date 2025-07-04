# Perfana Frontend

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![Meteor Version](https://img.shields.io/badge/meteor-2.13%2B-orange.svg)](https://www.meteor.com/)


**Perfana** is a performance analysis and observability tool designed to bring structure, insight, and automation to performance testing. It helps teams monitor, analyze, and understand the performance of systems under load by aggregating and correlating test results, metrics, traces and profiles. Perfana enables automatic detection of anomalies, generates trends over time, and supports root cause analysis, all with minimal manual effort the user.

With integrations for popular performance testing tools (like **Gatling**, **JMeter**, and **k6**), observability platforms (such as  **Grafana**, and **Dynatrace**), and CI/CD pipelines, Perfana is built to support modern, DevOps-oriented performance engineering workflows.

Perfana is particularly useful for teams that want to **shift performance testing left**, run **continuous performance tests**, and gain **actionable insights** quickly and efficiently.

## Key Features

- **Automated performance regression detection**
- **Integration with distributed tracing tools (Tempo, Jaeger) and profiling tools (Pyroscope)**
- **AI-powered root cause analysis (via LLM integration)**
- **Flexible integrations with test frameworks and monitoring tools**

## Prerequisites

Before running Perfana, ensure you have the following installed:

- **Node.js** (v14.0.0 or higher)
- **Meteor.js** (v2.13 or higher)
- **MongoDB** (v4.0 or higher)
- **Grafana** (for visualization)

**Perfana-fe** depends on the following components:
* MongoDB
* Grafana
* perfana-ds-api

It is recommended to run these components using the docker-compose.yml file in the [perfana-demo](https://github.com/perfana/perfana-demo) repository. This setup can also be used to create some test data in the database.

##  Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/perfana/perfana-fe.git
cd perfana-fe
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Settings
Create a `settings.json` file based on the provided `setings.example.json`:


### 4. Set up Host Entries
Add the following entries to your `/etc/hosts` file (or equivalent):

```
127.0.0.1    grafana mongo1 mongo2 mongo3

```

### 5. Start the Application

#### Option A: Using npm script
```bash
npm start
```

#### Option B: Using start script
```bash
./start.sh
```

#### Option C: Using Meteor directly
```bash
MONGO_URL=mongodb://mongo1:27011/perfana?replicaSet=rs0 \
MONGO_OPLOG_URL=mongodb://mongo1:27011/local?authSource=admin&replicaSet=rs0 \
meteor --settings settings.json --port 4000
```

The application will be available at `http://localhost:4000`

## 🐳 Docker Setup

If you prefer using Docker, you can use the provided Dockerfile:

```bash
docker build -t perfana-fe .
docker run -p 4000:4000 perfana-fe
```

## 📁 Project Structure

```
perfana-fe/
├── both/                 # Shared code (client/server)
├── client/               # Client-side code
├── imports/              # Meteor imports
│   ├── api/             # Server-side API methods
│   ├── collections/     # MongoDB collections
│   ├── helpers/         # Utility functions
│   └── ui/              # UI components
├── public/              # Static assets
├── server/              # Server-side code
├── tests/               # Test files
└── settings.json        # Configuration file
```

## ⚙️ Configuration


### Optional settings

#### Dynatrace Integration
```json
{
  "dynatraceApiToken": "your-dynatrace-token",
  "dynatraceUrl": "https://your-tenant.live.dynatrace.com"
}
```


#### Authentication (OIDC)
Example for using Keycloak:
```json
 "authenticationServices": {
    "oidc": {
    "loginStyle": "redirect",
    "clientId": "perfana",
    "secret": "secret",
    "serverUrl": "",
    "authorizationEndpoint": "https://<keycloak-host>/realms/<your-realm>/protocol/openid-connect/auth",
    "tokenEndpoint": "https://<keycloak-host>/realms/<your-realm>/protocol/openid-connect/token",
    "userinfoEndpoint": "https://<keycloak-host>/realms/<your-realm>/protocol/openid-connect/userinfo",
    "idTokenWhitelistFields": ["groups"],
    "requestPermissions": ["openid", "profile", "email", "groups"]
    }
}
```

## 🧪 Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the application |
| `npm test` | Run Jest tests |
| `npm run fetch-licenses` | Update license information |

### Code Quality

The project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **Jest** for unit testing

### IDE Setup (IntelliJ)

1. Install the Meteor plugin
2. Create a Meteor run configuration:
   - **Meteor executable**: `$USER_HOME$/.meteor/meteor`
   - **Program arguments**: `--settings settings.json --port 4000`
   - **Working directory**: `<path-to-repo>/perfana-fe`
   - **Environment variables**:
     - `MONGO_URL=mongodb://mongo:27017/perfana?replicaSet=rs0`
     - `MONGO_OPLOG_URL=mongodb://mongo:27017/local?authSource=admin&replicaSet=rs0`


## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation](https://docs.perfana.io/)
- [Demo Environment](https://github.com/perfana/perfana-demo)
- [Issues](https://github.com/perfana/perfana-fe/issues)

## 📞 Support

For support and questions:
- Create an issue in this repository
- Check the documentation at [docs.perfana.io](https://docs.perfana.io/)


---

**Built with ❤️ by the Perfana team**