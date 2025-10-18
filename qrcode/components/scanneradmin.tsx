import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Text, Button, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { Camera } from 'expo-camera';
import { db } from '../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import QRCode from 'react-native-qrcode-svg';

// ✅ Polyfill for Buffer (for base64 encoding)
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

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
    assignedEvent?: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // ✅ Handle QR code scanning
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      // Decode Base64
      let parsed: any;
      try {
        const decoded = atob(data);
        parsed = JSON.parse(decoded);
      } catch {
        Alert.alert('Invalid QR format', 'QR must include userId and country.');
        setTimeout(() => setScanned(false), 1500);
        return;
      }

      const { userId: scannedUserId, country: scannedCountry } = parsed;
      if (!scannedUserId || !scannedCountry) {
        Alert.alert('Missing data in QR code');
        setTimeout(() => setScanned(false), 1500);
        return;
      }

      // Fetch Firestore user
      const eventRef = doc(db, 'events', scannedCountry.toLowerCase(), 'users', scannedUserId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        Alert.alert('User not found in event database.');
        setTimeout(() => setScanned(false), 1500);
        return;
      }

      const eventData = eventDoc.data();
      const invited = eventData.invited ?? false;
      const firstName = eventData.firstName ?? 'Unknown';
      const lastName = eventData.lastName ?? '';
      const assignedEvent = eventData.assignedEvent ?? 'N/A';

      if (invited) {
        setInvitedUser({
          firstName,
          lastName,
          country: scannedCountry,
          userId: scannedUserId,
          assignedEvent,
        });
      } else {
        Alert.alert(
          '❌ Not Invited',
          `Name: ${firstName} ${lastName}\nCountry: ${scannedCountry}\nStatus: Not Invited`
        );
        setTimeout(() => setScanned(false), 1500);
      }
    } catch (error) {
      console.error('Scanner error:', error);
      Alert.alert('Error checking invitation status.');
      setTimeout(() => setScanned(false), 1500);
    }
  };

  // ✅ Only notify backend & web (no phone printing)
  const handlePrint = async () => {
    if (!invitedUser) return;

    const BASE_URL = "http://192.168.1.18:5001/fuze-be491/us-central1/v1";
    const { country, userId, assignedEvent } = invitedUser;

    try {
      // 1️⃣ Mark printed in Firestore
      await fetch(`${BASE_URL}/events/${country}/users/${userId}/markPrinted`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      console.log("✅ Marked user as printed in Firestore");

      // 2️⃣ Notify web dashboard (via notifyPrint)
            await fetch(`${BASE_URL}/notifyPrint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, country, assignedEvent }),
      });
      console.log("📢 Web notified to open print modal");
    } catch (err) {
      console.error("⚠️ Failed to notify backend/web:", err);
    }

    setInvitedUser(null);
    setScanned(false);
  };

  // ✅ Camera permission states
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

  // ✅ Main UI
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
          <View style={styles.invitedModal}>
            <Text style={styles.invitedTitle}>✅ Invited Guest</Text>
            <Text style={styles.invitedText}>
              Name: {invitedUser.firstName} {invitedUser.lastName}
            </Text>
            <Text style={styles.invitedText}>Country: {invitedUser.country}</Text>
            <Text style={styles.invitedText}>Event: {invitedUser.assignedEvent}</Text>

            <View style={{ marginVertical: 16 }}>
              <QRCode
                value={JSON.stringify({
                  userId: invitedUser.userId,
                  country: invitedUser.country,
                  assignedEvent: invitedUser.assignedEvent,
                })}
                size={100}
              />
            </View>

            <View style={styles.buttonRow}>
              <Button title="Close" onPress={() => { setInvitedUser(null); setScanned(false); }} />
              <Button title="Print Now" onPress={handlePrint} />
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
