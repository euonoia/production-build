import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Text, Button, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { Camera } from 'expo-camera';
import { db } from '../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function Scanner({ visible, onClose }: Props) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [invitedUser, setInvitedUser] = useState<{
    firstName: string;
    lastName: string;
    country: string;
    userId?: string;
  } | null>(null);

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
      let scannedUserId = '';
      let scannedCountry = '';

      try {
        const parsed = JSON.parse(data);
        scannedUserId = parsed.userId;
        scannedCountry = parsed.country;
      } catch {
        Alert.alert('Invalid QR format', 'QR code must include userId and country.');
        setTimeout(() => setScanned(false), 1500);
        return;
      }

      if (!scannedUserId || !scannedCountry) {
        Alert.alert('Missing data in QR code');
        setTimeout(() => setScanned(false), 1500);
        return;
      }

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

      if (invited) {
        setInvitedUser({ firstName, lastName, country, userId: scannedUserId });
      } else {
        Alert.alert(
          '❌ Not Invited',
          `Name: ${firstName} ${lastName}\nCountry: ${country}\nStatus: Not Invited`
        );
        setTimeout(() => setScanned(false), 1500);
      }
    } catch (error) {
      console.error('Scanner error:', error);
      Alert.alert('Error checking invitation status.');
      setTimeout(() => setScanned(false), 1500);
    }
  };

  const handlePrint = async (mode: 'print' | 'save') => {
    if (!invitedUser) return;

    const { firstName, lastName, country, userId } = invitedUser;

    // 🎨 Modern ID Card Layout
    const html = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #f7f7f7;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
            }
            .id-card {
              width: 340px;
              height: 500px;
              background: white;
              border-radius: 20px;
              box-shadow: 0 0 12px rgba(0,0,0,0.2);
              text-align: center;
              padding: 30px;
            }
            .header {
              background-color: #2e7d32;
              color: white;
              border-radius: 12px;
              padding: 10px;
              margin-bottom: 20px;
              font-size: 22px;
              font-weight: bold;
            }
            .name {
              font-size: 28px;
              font-weight: bold;
              color: #222;
              margin: 10px 0;
            }
            .country {
              font-size: 18px;
              color: #555;
              margin-bottom: 20px;
            }
            .status {
              font-size: 16px;
              color: #2e7d32;
              font-weight: bold;
              margin-bottom: 20px;
            }
            img {
              margin-top: 15px;
              border: 2px solid #2e7d32;
              border-radius: 8px;
              padding: 5px;
            }
          </style>
        </head>
        <body>
          <div class="id-card">
            <div class="header">🎟️ Event Access Pass</div>
            <div class="name">${firstName} ${lastName}</div>
            <div class="country">${country.toUpperCase()}</div>
            <div class="status">✅ INVITED GUEST</div>
            <p>User ID: ${userId}</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?data=${userId}&size=150x150" />
          </div>
        </body>
      </html>
    `;

    if (mode === 'print') {
      await Print.printAsync({ html });
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    }

    setInvitedUser(null);
    setScanned(false);
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
        {!invitedUser ? (
          <>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
            <Button title="Close" onPress={onClose} />
            <Text style={styles.text}>Scan QR Code</Text>
            {scanned && <Button title="Tap to Scan Again" onPress={() => setScanned(false)} />}
          </>
        ) : (
          // ✅ Invited Guest Modal
          <View style={styles.invitedModal}>
            <Text style={styles.invitedTitle}>✅ Invited Guest</Text>
            <Text style={styles.invitedText}>
              Name: {invitedUser.firstName} {invitedUser.lastName}
            </Text>
            <Text style={styles.invitedText}>Country: {invitedUser.country}</Text>

            <View style={{ marginVertical: 16 }}>
              <QRCode value={invitedUser.userId || ''} size={100} />
            </View>

            <View style={styles.buttonRow}>
              <Button title="Close" onPress={() => { setInvitedUser(null); setScanned(false); }} />
              <Button title="Print Now" onPress={() => handlePrint('print')} />
              <Button title="Save as PDF" onPress={() => handlePrint('save')} />
            </View>
          </View>
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
  invitedModal: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    margin: 20,
    borderRadius: 16,
    elevation: 5,
  },
  invitedTitle: { fontSize: 22, fontWeight: 'bold', color: '#1b5e20', marginBottom: 10 },
  invitedText: { fontSize: 18, color: '#333', marginBottom: 6 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '95%',
    marginTop: 20,
  },
});
