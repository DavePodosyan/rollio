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
    // await db.execAsync(`
    //   DROP TABLE IF EXISTS films;
    //   DROP TABLE IF EXISTS frames;
    // `);
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS films (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        title TEXT NOT NULL,
        iso INTEGER NOT NULL,
        camera TEXT,
        status TEXT NOT NULL DEFAULT 'in-camera',
        frame_count INTEGER NOT NULL,
        created_at DATETIME NOT NULL,
        completed_at DATETIME
      );
      CREATE TABLE IF NOT EXISTS frames (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        film_id INTEGER NOT NULL,
        aperture TEXT NOT NULL,
        shutter_speed TEXT NOT NULL,
        frame_no INTEGER NOT NULL,
        note TEXT,
        created_at DATETIME NOT NULL,
        FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
    );
    `);

    addMissingColumns(db);
  }

  const addMissingColumns = async (db: SQLiteDatabase) => {
    const columnsToAdd = [
      { table: 'films', column: 'expected_shots', type: 'INTEGER', defaultValue: '36' },
      // { table: 'films', column: 'format', type: 'TEXT', defaultValue: "'full'" },
      { table: 'films', column: 'push_pull', type: 'INTEGER', defaultValue: '0' }
    ];

    for (const { table, column, type, defaultValue } of columnsToAdd) {
      console.log(column);

      const result = await db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(${table});`
      );

      const columnExists = result.some((col) => col.name === column);

      if (!columnExists) {
        await db.execAsync(
          `ALTER TABLE ${table} ADD COLUMN ${column} ${type} DEFAULT ${defaultValue};`
        );
        console.log(`Added column ${column} to ${table}`);
      }
    }
  };

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
          <Stack.Screen name="(modal)/film" options={{ presentation: 'modal', gestureEnabled: false }} />
          <Stack.Screen name="add_frame" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="light" />
      </SQLiteProvider>
    </SafeAreaProvider>

  );
}
