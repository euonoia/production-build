import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Text, Button, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { Camera } from 'expo-camera';
import { db } from '../../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function Scanner({ visible, onClose }: Props) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [qrContent, setQrContent] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setQrContent(data);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('In order to participate, input your complete details.');
        setTimeout(() => setScanned(false), 1500);
        return;
      }

      // 1. Get the current user's country from Information/{userId}
      const infoDoc = await getDoc(doc(db, 'Information', user.uid));
      if (!infoDoc.exists()) {
        Alert.alert('User information not found. Please complete your profile.');
        setTimeout(() => setScanned(false), 1500);
        return;
      }
      const userInfo = infoDoc.data();
      const country = userInfo.country;

      // 2. Try to parse the scanned QR code as JSON (recommended QR format)
      let scannedUserId = '';
      let scannedCountry = '';
      try {
        const parsed = JSON.parse(data);
        scannedUserId = parsed.userId;
        scannedCountry = parsed.country;
      } catch {
        // If not JSON, treat as just userId
        scannedUserId = data;
        scannedCountry = country; // fallback to current user's country
      }

      // 3. Check if the scanned QR code matches the current user
      if (scannedUserId !== user.uid) {
        Alert.alert('This is not your QR code or this content is restricted to your country.');
        setTimeout(() => setScanned(false), 1500);
        return;
      }

      // 4. Check if the user exists in Event/{country}/users/{userId}
      const eventUserDoc = await getDoc(doc(db, 'Event', country, 'users', user.uid));
      if (eventUserDoc.exists()) {
        const eventUserData = eventUserDoc.data();
        if (eventUserData.invited === true) {
          Alert.alert('You are INVITED!');
        } else if (eventUserData.invited === false) {
          Alert.alert('You are NOT invited.');
        } else {
          Alert.alert('Invitation status unknown.');
        }
      } else {
        Alert.alert('You are not registered for this event/country.');
      }
    } catch (err) {
      Alert.alert('Error checking invitation status.');
    }

    setTimeout(() => setScanned(false), 1500);
  };

  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalContainer}>
          <Text>Requesting camera permission...</Text>
          <Button title="Close" onPress={onClose} />
        </View>
      </Modal>
    );
  }
  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalContainer}>
          <Text>No access to camera</Text>
          <Button title="Close" onPress={onClose} />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />
        <Button title="Close" onPress={onClose} />
        <Text style={styles.text}>Scan QR code</Text>
        {scanned && (
          <Button title="Tap to Scan Again" onPress={() => setScanned(false)} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1, alignSelf: 'stretch' },
  text: {
    fontSize: 18,
    textAlign: 'center',
    margin: 16,
    color: '#333',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
  },
});