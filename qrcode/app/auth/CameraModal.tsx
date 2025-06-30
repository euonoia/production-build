import React, { useRef, useState } from 'react';
import { Modal, View, StyleSheet, Text, Button, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { db } from '../../FirebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
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

    try {
      // Parse the QR code data as JSON to get the scanned user's userId
      let friendUid = '';
      let friendInfo = {};
      try {
        const parsed = JSON.parse(data);
        friendUid = parsed.userId;
        friendInfo = parsed;
      } catch {
        Alert.alert('Invalid QR code format.');
        setScanned(false);
        qrLock.current = false;
        return;
      }

      if (!user) {
        Alert.alert('No user logged in.');
        onClose();
        return;
      }
      await setDoc(doc(db, 'friend', `${user.uid}_${friendUid}`), {
        userId: user.uid,
        friendUid,
        friendInfo, // store all info from QR
        createdAt: new Date(),
      });
      Alert.alert('Friend added!');
    } catch (error) {
      Alert.alert('Invalid QR code or error saving friend.');
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
          barCodeScannerSettings={{ barCodeTypes: ['qr'] }}
        />
        <Button title="Close" onPress={onClose} />
        <Text style={styles.text}>Scan a friend's QR code</Text>
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