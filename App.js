import * as React from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Text, View, StyleSheet, Alert, Platform, SafeAreaView } from 'react-native';
import Constants from 'expo-constants';

// React Native Paper components
import { 
  Card, 
  Button, 
  Dialog, 
  Portal, 
  Provider as PaperProvider 
} from 'react-native-paper';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';

export default function App() {
  // State variables for location and weather
  const [latitude, setLatitude] = useState(57.538900);
  const [longitude, setLongitude] = useState(25.425727);
  const [weatherData, setWeatherData] = useState(null);
  const [visible, setVisible] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Reference to store the location watching
  const locationSubscription = useRef(null);

  const API_KEY = 'Your API key';

  // Show/Hide dialog methods
  const showDialog = () => setVisible(true);
  const hideDialog = () => setVisible(false);

  // Memoized function to fetch weather data
  const fetchWeatherData = useCallback(async (lat, lon) => {
    const apiURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

    try {
      if (!API_KEY || API_KEY === 'YOUR_ACTUAL_API_KEY_HERE') {
        Alert.alert('API Error', 'Please add a valid OpenWeatherMap API key');
        return;
      }

      // Fetch weather data
      const response = await fetch(apiURL);
      
      // Check if response is successful
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
      }

      // Parse JSON response
      const data = await response.json();
      
      // Validate and set weather data
      if (data) {
        setWeatherData({
          place: data.name || 'Unknown Location',
          latitude: lat.toFixed(4),
          longitude: lon.toFixed(4),
          temp: data.main.temp.toFixed(2),
          pressure: data.main.pressure,
          humidity: data.main.humidity,
          description: data.weather[0].description
        });
      } else {
        throw new Error('Unable to retrieve weather data');
      }

    } catch (error) {
      // Handle and display any errors
      console.error('Weather fetch error:', error);
    }
  }, [API_KEY]);

  // Memoized function to start location tracking
  const startLocationTracking = useCallback(async () => {
    try {
      // Request permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permission to access location was denied');
        return;
      }

      // Stop any existing subscription
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      // Start watching location
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Or every 10 meters
        },
        (location) => {
          const { latitude: newLat, longitude: newLon } = location.coords;
          
          // Update map and fetch weather if location changed
          setLatitude(newLat);
          setLongitude(newLon);
          
          // Fetch weather for new location
          fetchWeatherData(newLat, newLon);
        }
      );
    } catch (error) {
      setLocationError('Error tracking location: ' + error.message);
      Alert.alert('Location Error', error.message);
    }
  }, [fetchWeatherData]);

  useEffect(() => {
    startLocationTracking();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [startLocationTracking]);

  // Manual weather fetch button
  const getWeather = () => {
    fetchWeatherData(latitude, longitude);
    showDialog();
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <Card style={styles.cardContainer}>
          {/* Map View */}
          <MapView 
            style={styles.map}
            showsUserLocation
            showsCompass
            region={{
              latitude: latitude,
              longitude: longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          />

          {/* Weather Button */}
          <View style={styles.buttonContainer}>
            <Button 
              icon="map"
              mode="contained"
              onPress={getWeather}
              style={styles.button}
            >
              Show Weather
            </Button>
          </View>

          {/* Weather Dialog */}
          <Portal>
            <Dialog visible={visible} onDismiss={hideDialog}>
              <Dialog.Title>Weather Details</Dialog.Title>
              <Dialog.Content>
                {weatherData && (
                  <View>
                    <Text style={styles.weatherDetailLine}>
                      <Text style={styles.boldText}>Place: </Text>
                      {weatherData.place}
                    </Text>
                    <Text style={styles.weatherDetailLine}>
                      <Text style={styles.boldText}>Latitude: </Text>
                      {weatherData.latitude}
                    </Text>
                    <Text style={styles.weatherDetailLine}>
                      <Text style={styles.boldText}>Longitude: </Text>
                      {weatherData.longitude}
                    </Text>
                    <Text style={styles.weatherDetailLine}>
                      <Text style={styles.boldText}>Temp: </Text>
                      {weatherData.temp}°C
                    </Text>
                    <Text style={styles.weatherDetailLine}>
                      <Text style={styles.boldText}>Pressure: </Text>
                      {weatherData.pressure}
                    </Text>
                    <Text style={styles.weatherDetailLine}>
                      <Text style={styles.boldText}>Humidity: </Text>
                      {weatherData.humidity}%
                    </Text>
                    <Text style={styles.weatherDetailLine}>
                      <Text style={styles.boldText}>Description: </Text>
                      {weatherData.description}
                    </Text>
                  </View>
                )}
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={hideDialog}>Close</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </Card>

        {/* Display any location errors */}
        {locationError && (
          <Text style={styles.errorText}>{locationError}</Text>
        )}
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  cardContainer: {
    flex: 1,
    margin: 8,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 60,
    left: 20,
    width: '50%',
  },
  button: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
  weatherDetailLine: {
    marginVertical: 4,
  },
  boldText: {
    fontWeight: 'bold',
  },
});
