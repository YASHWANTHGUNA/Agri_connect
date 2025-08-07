// agriconnect2.0/src/components/Dashboard.js

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../Dashboard.css'; // Make sure this path is correct

// NEW IMPORTS for Charting
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Import the new WeatherChart component
import WeatherChart from './WeatherChart';


// Register Chart.js components (Moved down, after all imports)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Use environment variables for API URLs
const WEATHER_API_BASE_URL = process.env.REACT_APP_WEATHER_API_URL || 'http://localhost:5003/api/weather/current';
const FORECAST_API_BASE_URL = process.env.REACT_APP_FORECAST_API_URL || 'http://localhost:5003/api/weather/forecast';
const FARM_METRICS_UPDATE_INTERVAL = 5000; // Update farm metrics every 5 seconds (5000 ms)

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State for current weather data
  const [currentWeather, setCurrentWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState(null);

  // State for 5-day forecast data
  const [fiveDayForecast, setFiveDayForecast] = useState(null);
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [forecastError, setForecastError] = useState(null);

  // State for farm metrics
  const [realFarmMetrics, setRealFarmMetrics] = useState({
    soilMoisture: { value: 45, unit: '%' },
    temperature: { value: 28, unit: '°C' },
    humidity: { value: 70, unit: '%' },
    cropGrowth: { value: 75, unit: '%' },
    yieldEstimate: { value: 500, unit: 'kg/acre' },
    marketPriceTomato: { value: 30, unit: '/kg' },
    lastUpdated: { value: new Date().toLocaleTimeString(), unit: '' }
  });

  // Example city - you might want to get this from user profile or a selection
  const userCity = user?.farmLocation || "Hyderabad"; // Use user's farm location or default

  // Function to fetch current weather
  const fetchCurrentWeather = useCallback(async (city) => {
    setLoadingWeather(true);
    setWeatherError(null);
    try {
      const response = await axios.get(`${WEATHER_API_BASE_URL}/${encodeURIComponent(city)}`);
      setCurrentWeather(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch current weather. Please try again.';
      setWeatherError(errorMessage);
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching current weather:', err);
      }
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  // Function to fetch 5-day forecast
  const fetchFiveDayForecast = useCallback(async (city) => {
    setLoadingForecast(true);
    setForecastError(null);
    try {
      const response = await axios.get(`${FORECAST_API_BASE_URL}/${encodeURIComponent(city)}`);
      setFiveDayForecast(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch 5-day forecast. Please try again.';
      setForecastError(errorMessage);
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching 5-day forecast:', err);
      }
    } finally {
      setLoadingForecast(false);
    }
  }, []);

  // Function to simulate real-time farm metrics update
  const updateFarmMetrics = useCallback(() => {
    setRealFarmMetrics(prevMetrics => {
      // Simulate slight variations for real-time effect
      const newMoisture = Math.max(0, Math.min(100, prevMetrics.soilMoisture.value + (Math.random() - 0.5) * 2));
      const newTemp = Math.max(15, Math.min(40, prevMetrics.temperature.value + (Math.random() - 0.5) * 1));
      const newHumidity = Math.max(40, Math.min(95, prevMetrics.humidity.value + (Math.random() - 0.5) * 3));
      const newCropGrowth = Math.max(0, Math.min(100, prevMetrics.cropGrowth.value + (Math.random() - 0.5) * 0.5));
      const newYieldEstimate = Math.max(300, Math.min(800, prevMetrics.yieldEstimate.value + (Math.random() - 0.5) * 10));
      const newMarketPriceTomato = Math.max(20, Math.min(50, prevMetrics.marketPriceTomato.value + (Math.random() - 0.5) * 1));

      return {
        soilMoisture: { ...prevMetrics.soilMoisture, value: parseFloat(newMoisture.toFixed(1)) },
        temperature: { ...prevMetrics.temperature, value: parseFloat(newTemp.toFixed(1)) },
        humidity: { ...prevMetrics.humidity, value: parseFloat(newHumidity.toFixed(1)) },
        cropGrowth: { ...prevMetrics.cropGrowth, value: parseFloat(newCropGrowth.toFixed(1)) },
        yieldEstimate: { ...prevMetrics.yieldEstimate, value: parseFloat(newYieldEstimate.toFixed(1)) },
        marketPriceTomato: { ...prevMetrics.marketPriceTomato, value: parseFloat(newMarketPriceTomato.toFixed(1)) },
        lastUpdated: { value: new Date().toLocaleTimeString(), unit: '' }
      };
    });
  }, []);


  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch weather data on component mount
    fetchCurrentWeather(userCity);
    fetchFiveDayForecast(userCity);

    // Set up interval for farm metrics
    const intervalId = setInterval(updateFarmMetrics, FARM_METRICS_UPDATE_INTERVAL);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [user, navigate, userCity, fetchCurrentWeather, fetchFiveDayForecast, updateFarmMetrics]);


  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Logout error:', error);
      }
      // Show error to user
      alert('Failed to logout. Please try again.');
    }
  };

  const renderWeatherSection = () => {
    if (loadingWeather || loadingForecast) {
      return <div className="loading-spinner">Loading weather data...</div>;
    }

    if (weatherError || forecastError) {
      return (
        <div className="error-container">
          <p className="alert-error">{weatherError || forecastError}</p>
          <button onClick={() => {
            fetchCurrentWeather(userCity);
            fetchFiveDayForecast(userCity);
          }} className="retry-button">
            Retry
          </button>
        </div>
      );
    }

    return (
      <>
        {/* Current Day Weather */}
        {currentWeather && (
          <div className="weather-report">
            <div className="weather-card current-weather-card">
              <h3>Today ({new Date(currentWeather.dt * 1000).toLocaleDateString()})</h3>
              <p className="temperature">{currentWeather.main.temp}°C</p>
              <p className="description">{currentWeather.weather[0].description}</p>
              <div className="weather-details">
                <p>Feels like: <strong>{currentWeather.main.feels_like}°C</strong></p>
                <p>Humidity: <strong>{currentWeather.main.humidity}%</strong></p>
                <p>Wind: <strong>{currentWeather.wind.speed} m/s</strong></p>
                <p>Pressure: <strong>{currentWeather.main.pressure} hPa</strong></p>
              </div>
            </div>
          </div>
        )}

        {/* 5-Day Forecast - Chart */}
        <div className="forecast-charts-container">
          {fiveDayForecast && <WeatherChart forecastData={fiveDayForecast} />}
        </div>
      </>
    );
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">SMART AGRICONNECT</h1>
        <nav className="dashboard-nav">
          <ul>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/forum">Community Forum</Link></li>
            <li><Link to="/chatbot">Agri-Chatbot</Link></li>
            <li><Link to="/profile">Profile</Link></li>
            <li><button onClick={handleLogout} className="logout-button">Logout</button></li>
          </ul>
        </nav>
      </header>

      <section className="dashboard-section weather-section">
        <h2>Weather Report for {userCity}</h2>
        {renderWeatherSection()}
      </section>

      <section className="dashboard-section farm-metrics-section">
        <h2>Real-time Farm Metrics</h2>
        <div className="farm-metrics-grid">
          {/* Soil Moisture */}
          <div className="metric-item">
            <p className="metric-label">Soil Moisture</p>
            <p className="metric-value value-weather">
              {realFarmMetrics.soilMoisture.value}{realFarmMetrics.soilMoisture.unit}
            </p>
            <p className="metric-info">Current soil water content</p>
          </div>

          {/* Air Temperature */}
          <div className="metric-item">
            <p className="metric-label">Air Temperature</p>
            <p className="metric-value value-crop">
              {realFarmMetrics.temperature.value}{realFarmMetrics.temperature.unit}
            </p>
            <p className="metric-info">Ambient air temperature</p>
          </div>

          {/* Air Humidity */}
          <div className="metric-item">
            <p className="metric-label">Air Humidity</p>
            <p className="metric-value value-info">
              {realFarmMetrics.humidity.value}{realFarmMetrics.humidity.unit}
            </p>
            <p className="metric-info">Relative air humidity</p>
          </div>

          {/* Crop Growth Status */}
          <div className="metric-item">
            <p className="metric-label">Crop Growth</p>
            <p className="metric-value value-info">
              {realFarmMetrics.cropGrowth.value}{realFarmMetrics.cropGrowth.unit}
            </p>
            <p className="metric-info">Status of crop development</p>
          </div>

          {/* Yield Estimate */}
          <div className="metric-item">
            <p className="metric-label">Yield Estimate</p>
            <p className="metric-value value-info">
              {realFarmMetrics.yieldEstimate.value}{realFarmMetrics.yieldEstimate.unit}
            </p>
            <p className="metric-info">Estimated harvest quantity</p>
          </div>

          {/* Market Price (Tomato Example) */}
          <div className="metric-item">
            <p className="metric-label">Tomato Price</p>
            <p className="metric-value value-market">
              ₹{realFarmMetrics.marketPriceTomato.value}{realFarmMetrics.marketPriceTomato.unit}
            </p>
            <p className="metric-info">Current market rate for tomatoes</p>
          </div>

          {/* Last Updated */}
          <div className="metric-item">
            <p className="metric-label">Last Updated</p>
            <p className="metric-value value-timestamp">
              {realFarmMetrics.lastUpdated.value}{realFarmMetrics.lastUpdated.unit}
            </p>
            <p className="metric-info">Data generation timestamp</p>
          </div>
        </div>
      </section>
    </div>
  );
}