// src/components/WeatherChart.js
import React from 'react';
import { Line, Bar } from 'react-chartjs-2'; // Import Bar for rainfall
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
  Filler
} from 'chart.js';

// Register Chart.js components (ensure these are registered once, often in App.js or index.js, but
// harmless to keep here if not centralized elsewhere)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const WeatherChart = ({ forecastData }) => {
  if (!forecastData || !forecastData.list || forecastData.list.length === 0) {
    return <p className="no-data-message">No forecast data available to display charts for the selected city. Please try a different city or check back later.</p>;
  }

  // Use all 3-hourly data points for a more detailed trend
  const labels = forecastData.list.map(dataPoint => {
    const date = new Date(dataPoint.dt * 1000);
    // Format as "Day, Hour:Minute" (e.g., "Fri, 14:00")
    return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  });

  const temperatures = forecastData.list.map(dataPoint => dataPoint.main.temp);
  const humidities = forecastData.list.map(dataPoint => dataPoint.main.humidity);
  // Calculate approximate rainfall per day from 3-hourly data (summing up 'rain' property if available)
  // This is an approximation as OpenWeatherMap provides 'rain' for the last 3 hours
  const rainfall = forecastData.list.map(dataPoint => (dataPoint.rain && dataPoint.rain['3h']) ? dataPoint.rain['3h'] : 0);


  const temperatureData = {
    labels: labels,
    datasets: [
      {
        label: 'Temperature (°C)',
        data: temperatures,
        fill: true,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        tension: 0.4, // Makes the line curved
        pointRadius: 4,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        pointBorderColor: '#fff',
        pointHoverRadius: 6,
      },
    ],
  };

  const humidityData = {
    labels: labels,
    datasets: [
      {
        label: 'Humidity (%)',
        data: humidities,
        fill: true,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#fff',
        pointHoverRadius: 6,
      },
    ],
  };

  const rainfallData = {
    labels: labels,
    datasets: [
      {
        label: 'Rainfall (mm/3h)',
        data: rainfall,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        barThickness: 'flex', // Makes bars responsive
        categoryPercentage: 0.8, // Adjusts bar width
        barPercentage: 0.9 // Adjusts bar spacing
      },
    ],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allows chart to take height of parent div
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
            font: {
                size: 14
            },
            color: '#333'
        }
      },
      title: {
        display: true,
        text: 'Weather Forecast', // Generic title, specific titles will be passed inline
        font: {
            size: 18,
            weight: 'bold'
        },
        color: '#2c3e50'
      },
      tooltip: { // Enhanced tooltip for better info on hover
        mode: 'index',
        intersect: false,
        callbacks: {
            label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed.y !== null) {
                    label += context.parsed.y;
                    if (context.dataset.label.includes('Temperature')) {
                        label += '°C';
                    } else if (context.dataset.label.includes('Humidity')) {
                        label += '%';
                    } else if (context.dataset.label.includes('Rainfall')) {
                        label += ' mm';
                    }
                }
                return label;
            }
        },
        titleFont: {
            size: 16
        },
        bodyFont: {
            size: 14
        },
        padding: 10,
        boxPadding: 5,
        displayColors: true,
    }
    },
    scales: {
        x: {
            grid: {
                display: false // Hide x-axis grid lines for cleaner look
            },
            ticks: {
                font: {
                    size: 12
                },
                color: '#555'
            }
        },
        y: {
            beginAtZero: true,
            grid: {
                color: 'rgba(0, 0, 0, 0.08)' // Lighter y-axis grid lines
            },
            ticks: {
                font: {
                    size: 12
                },
                color: '#555'
            }
        }
    },
    hover: {
        mode: 'nearest',
        intersect: true,
        animationDuration: 400
    },
    interaction: {
        mode: 'index',
        intersect: false,
    },
  };

  return (
    <div className="forecast-charts-container">
      <div className="chart-wrapper">
        <h3>Temperature Forecast</h3>
        <div className="chart-container">
            <Line data={temperatureData} options={{ ...commonOptions, plugins: { ...commonOptions.plugins, title: { ...commonOptions.plugins.title, text: '5-Day Temperature Forecast' } } }} />
        </div>
      </div>

      <div className="chart-wrapper">
        <h3>Humidity Forecast</h3>
        <div className="chart-container">
            <Line data={humidityData} options={{ ...commonOptions, plugins: { ...commonOptions.plugins, title: { ...commonOptions.plugins.title, text: '5-Day Humidity Forecast' } } }} />
        </div>
      </div>

      <div className="chart-wrapper">
        <h3>Rainfall Forecast</h3>
        <div className="chart-container">
            <Bar data={rainfallData} options={{ ...commonOptions, plugins: { ...commonOptions.plugins, title: { ...commonOptions.plugins.title, text: '5-Day Rainfall Forecast (mm/3h)' } } }} />
        </div>
      </div>
    </div>
  );
};

export default WeatherChart;