const getBackendUrl = () => {
    const port = process.env.REACT_APP_BACKEND_PORT || '5003';
    const host = process.env.REACT_APP_BACKEND_HOST || 'localhost';
    return `http://${host}:${port}`;
};

const config = {
    backendUrl: getBackendUrl(),
    apiEndpoints: {
        auth: '/api/auth',
        weather: '/api/weather',
        dialogflow: '/api/dialogflow',
        forum: '/api/forum'
    },
    axiosConfig: {
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json'
        },
        withCredentials: true
    },
    tokenRefreshInterval: 45 * 60 * 1000,
    retryAttempts: 3,
    retryDelay: 1000
};

export default config;
