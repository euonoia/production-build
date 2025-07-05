import React, { useRef, useState } from 'react';
import { Modal, View, StyleSheet, Text, Button, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { db } from '../../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function CameraModal({ visible, onClose }: Props) {
  const [scanned, setScanned] = useState(false);
  const qrLock = useRef(false);
  const auth = getAuth();
  const user = auth.currentUser;

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || qrLock.current) return;
    setScanned(true);
    qrLock.current = true;

    let eventId = '';
    try {
      // Support both URL with eventId param and plain eventId
      if (data.startsWith('http')) {
        const url = new URL(data);
        eventId = url.searchParams.get('eventId') || '';
      } else {
        eventId = data;
      }
    } catch {
      eventId = data;
    }

    if (!eventId) {
      Alert.alert('Invalid QR code: No eventId found.');
      setScanned(false);
      qrLock.current = false;
      return;
    }

    try {
      if (!user) {
        Alert.alert('No user logged in.');
        onClose();
        return;
      }
      // Check if event exists and if user is invited
      const eventDoc = await getDoc(doc(db, 'Event', eventId));
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        if (
          eventData.invitedUsers &&
          Array.isArray(eventData.invitedUsers) &&
          eventData.invitedUsers.includes(user.uid)
        ) {
          Alert.alert('You are INVITED!');
        } else {
          Alert.alert('You are NOT invited.');
        }
      } else {
        Alert.alert('Event not found.');
      }
    } catch (error) {
      Alert.alert('Error checking invitation status.');
      console.log(error);
    }
    setTimeout(() => {
      setScanned(false);
      qrLock.current = false;
      onClose();
    }, 1500);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        <Button title="Close" onPress={onClose} />
        <Text style={styles.text}>Scan event QR code</Text>
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