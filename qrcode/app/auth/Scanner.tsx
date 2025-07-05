import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Text, Button, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { Camera } from 'expo-camera';
import { db } from '../../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

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
      // Check if a document with this userId exists in the Event collection
      const eventDoc = await getDoc(doc(db, 'Event', data));
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        if (eventData.invited === true) {
          Alert.alert('You are INVITED!');
        } else if (eventData.invited === false) {
          Alert.alert('You are NOT invited.');
        } else {
          Alert.alert('Invitation status unknown.');
        }
      } else {
        Alert.alert('User not found in Event database.');
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
        {qrContent && <Text style={styles.text}>Scanned: {qrContent}</Text>}
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