import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Lufga-Regular': require('../assets/fonts/Lufga-Regular.ttf'),
    'Lufga-Medium': require('../assets/fonts/Lufga-Medium.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  const creatDbIfNotExists = async (db: SQLiteDatabase) => {
    console.log('Creating database if not exists');
    console.log(FileSystem.documentDirectory)
    //drop table film if exists
    await db.execAsync(`
      DROP TABLE IF EXISTS frames;
    `);
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      CREATE TABLE IF NOT EXISTS films (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        iso INTEGER NOT NULL,
        camera TEXT,
        status TEXT NOT NULL DEFAULT 'in-camera',
        frame_count INTEGER NOT NULL,
        created_at DATETIME NOT NULL,
        completed_at DATETIME
      );
      CREATE TABLE IF NOT EXISTS frames (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        film_id INTEGER NOT NULL,
        aperture TEXT,
        shutter_speed TEXT,
        frame_no INTEGER NOT NULL,
        note TEXT,
        created_at DATETIME NOT NULL,
        FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
    );
    `);
    // await db.execAsync(`
    //   PRAGMA journal_mode = 'wal';
    //   CREATE TABLE films (id INTEGER PRIMARY KEY NOT NULL, value TEXT NOT NULL, intValue INTEGER);
    //   `);
  }

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="rollio.db" onInit={creatDbIfNotExists}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "#09090B",
            }
          }}>
          <Stack.Screen name="home" />
          <Stack.Screen name="film" />
          <Stack.Screen name="add_film" options={{ presentation: 'modal' }} />
          <Stack.Screen name="add_frame" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="light" />
      </SQLiteProvider>
    </SafeAreaProvider>

  );
}
