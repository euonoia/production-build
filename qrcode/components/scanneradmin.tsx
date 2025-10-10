import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Text, Button, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { Camera } from 'expo-camera';
import { db } from '../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function Scanner({ visible, onClose }: Props) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      // ✅ QR code expected format: JSON { userId: string, country: string }
      let scannedUserId = '';
      let scannedCountry = '';

      try {
        const parsed = JSON.parse(data);
        scannedUserId = parsed.userId;
        scannedCountry = parsed.country;
      } catch (err) {
        Alert.alert('Invalid QR format', 'QR code must include userId and country.');
        setTimeout(() => setScanned(false), 1500);
        return;
      }

      if (!scannedUserId || !scannedCountry) {
        Alert.alert('Missing data in QR code');
        setTimeout(() => setScanned(false), 1500);
        return;
      }

      // ✅ Fetch event record from Firestore
      const eventRef = doc(db, 'events', scannedCountry.toLowerCase(), 'users', scannedUserId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        Alert.alert('User not registered in event database.');
        setTimeout(() => setScanned(false), 1500);
        return;
      }

      const eventData = eventDoc.data();
      const invited = eventData.invited ?? false;
      const firstName = eventData.firstName ?? 'Unknown';
      const lastName = eventData.lastName ?? '';
      const country = scannedCountry ?? 'Unknown';

      // ✅ Show only firstName, lastName, and invited status
      if (invited) {
        Alert.alert(
          '✅ Invited Guest',
          `Name: ${firstName} ${lastName}\nCountry: ${country}`
        );
      } else {
        Alert.alert(
          '❌ Not Invited',
          `Name: ${firstName} ${lastName}\nCountry: ${country}\nStatus: Not Invited`
        );
      }

    } catch (error) {
      console.error('Scanner error:', error);
      Alert.alert('Error checking invitation status.');
    }

    setTimeout(() => setScanned(false), 1500);
  };

  // --- CAMERA PERMISSION STATES ---
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
        <Text style={styles.text}>Scan QR Code</Text>
        {scanned && <Button title="Tap to Scan Again" onPress={() => setScanned(false)} />}
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
