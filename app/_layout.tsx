import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { SafeAreaProvider } from "react-native-safe-area-context";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'home',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    LufgaRegular: require('../assets/fonts/Lufga-Regular.ttf'),
    LufgaMedium: require('../assets/fonts/Lufga-Medium.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {

  return (
    <SafeAreaProvider style={{ backgroundColor: '#09090B' }}>
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
          <Stack.Screen name="support"/>
          <Stack.Screen name="(modal)/film" options={{ presentation: 'modal', gestureEnabled: false }} />
          <Stack.Screen name="(modal)/frame" options={{ presentation: 'modal', gestureEnabled: false }} />
          <Stack.Screen name="(modal)/disabled_frame" options={{ presentation: 'modal', gestureEnabled: true }} />
        </Stack>
        <StatusBar style="light" />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

async function creatDbIfNotExists(db: SQLiteDatabase) {
  console.log('Creating database if not exists');
  console.log(FileSystem.documentDirectory)
  // const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory! + 'frames');
  // console.log('Contents of documentDirectory:', files);
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
  migrateImagePaths(db);
}

async function addMissingColumns(db: SQLiteDatabase) {
  const columnsToAdd = [
    { table: 'films', column: 'expected_shots', type: 'INTEGER', defaultValue: '36' },
    { table: 'films', column: 'push_pull', type: 'INTEGER', defaultValue: '0' },
    { table: 'frames', column: 'lens', type: 'TEXT', defaultValue: '""' },
    { table: 'frames', column: 'image', type: 'TEXT', defaultValue: '""' }
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
}

async function migrateImagePaths(db: SQLiteDatabase) {
  const frames = await db.getAllAsync<{
    id: number;
    image: string | null;
  }>(`SELECT id, image FROM frames WHERE image IS NOT NULL AND image LIKE 'file://%';`);

  for (const frame of frames) {
    if (frame.image) {
      const matchIndex = frame.image.indexOf('/frames/');

      if (matchIndex !== -1) {
        const relativePath = frame.image.substring(matchIndex + 1);

        //update the image path in db
        await db.runAsync(
          `UPDATE frames SET image = ? WHERE id = ?;`,
          [relativePath, frame.id]
        );
      }
    }
  }
}