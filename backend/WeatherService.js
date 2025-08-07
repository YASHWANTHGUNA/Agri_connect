// agriconnect2.0/backend/WeatherService.js
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
const BASE_FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

let isWeatherEnabled = false;

if (!API_KEY) {
    console.warn('OpenWeather API key not found. Weather service will be disabled.');
    console.warn('To enable weather service:');
    console.warn('1. Get an API key from https://openweathermap.org/api');
    console.warn('2. Add OPENWEATHERMAP_API_KEY=your_api_key to your .env file');
    console.warn('3. Restart the server');
} else {
    isWeatherEnabled = true;
    console.log('Weather service initialized successfully');
}

class WeatherService {
    static async getCurrentWeather(city) {
        if (!isWeatherEnabled) {
            throw new Error('Weather service is not configured. Please contact the administrator.');
        }

        if (!city || typeof city !== 'string') {
            throw new Error('Invalid city parameter');
        }

        try {
            const response = await axios.get(BASE_WEATHER_URL, {
                params: {
                    q: city,
                    appid: API_KEY,
                    units: 'metric'
                },
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching current weather for ${city}:`, error.response ? error.response.data : error.message);
            
            if (error.response) {
                switch (error.response.status) {
                    case 404:
                        throw new Error('City not found. Please check the city name.');
                    case 401:
                        throw new Error('Weather service authentication failed. Please contact the administrator.');
                    case 429:
                        throw new Error('Weather service rate limit exceeded. Please try again later.');
                    default:
                        throw new Error(`Weather service error: ${error.response.status}`);
                }
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('Weather service request timed out. Please try again.');
            } else {
                throw new Error('Failed to fetch current weather data. Please try again later.');
            }
        }
    }

    static async getFiveDayForecast(city) {
        if (!isWeatherEnabled) {
            throw new Error('Weather service is not configured. Please contact the administrator.');
        }

        if (!city || typeof city !== 'string') {
            throw new Error('Invalid city parameter');
        }

        try {
            const response = await axios.get(BASE_FORECAST_URL, {
                params: {
                    q: city,
                    appid: API_KEY,
                    units: 'metric'
                },
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching 5-day forecast for ${city}:`, error.response ? error.response.data : error.message);
            
            if (error.response) {
                switch (error.response.status) {
                    case 404:
                        throw new Error('City not found. Please check the city name.');
                    case 401:
                        throw new Error('Weather service authentication failed. Please contact the administrator.');
                    case 429:
                        throw new Error('Weather service rate limit exceeded. Please try again later.');
                    default:
                        throw new Error(`Weather service error: ${error.response.status}`);
                }
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('Weather service request timed out. Please try again.');
            } else {
                throw new Error('Failed to fetch 5-day forecast data. Please try again later.');
            }
        }
    }
}

export default WeatherService;