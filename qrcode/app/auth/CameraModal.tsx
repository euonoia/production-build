import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, StyleSheet, Text, Button, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { db, auth } from '../../FirebaseConfig';
import { addDoc,collection,query,where,getDocs } from 'firebase/firestore';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function CameraModal({ visible, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [friendInfo, setFriendInfo] = useState<any>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const qrLock = useRef(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (visible) {
      setScanned(false);
      qrLock.current = false;
      setLoading(false);
      setFriendInfo(null);
      setConfirmVisible(false);
    }
  }, [visible]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || qrLock.current) return;
    setScanned(true);
    qrLock.current = true;

    try {
      const parsed = JSON.parse(data);
      if (!parsed.userId) throw new Error('Invalid QR code');

      if (!user) throw new Error('No user logged in');

      if (parsed.userId === user.uid) throw new Error('Cannot add yourself');

      setFriendInfo(parsed);
      setConfirmVisible(true);
    } catch (err: any) {
      Alert.alert(err.message || 'Invalid QR code data.');
      resetScanner();
    }
  };

  const handleAddFriend = async () => {
  if (!friendInfo || !user) return;
  setLoading(true);
  try {
    const currentUid = user.uid;
    const friendUid = friendInfo.userId;

    // Prevent duplicates
    const existingQuery = query(
      collection(db, "friendships"),
      where("users", "array-contains", currentUid)
    );
    const snapshot = await getDocs(existingQuery);

    const alreadyFriends = snapshot.docs.some(doc => {
      const users = doc.data().users;
      return users.includes(friendUid);
    });
    if (alreadyFriends) {
      Alert.alert("You are already friends with this user.");
      setLoading(false);
      return;
    }

    // Create the friendship document
    await addDoc(collection(db, "friendships"), {
      users: [currentUid, friendUid],
      createdAt: new Date(),
      status: "accepted", // Optional for future features
    });

    Alert.alert("✅ Friend added!");
    closeAll();
  } catch (err) {
    console.log("Add friend error:", err);
    Alert.alert("Something went wrong.");
  } finally {
    setLoading(false);
  }
};

  const resetScanner = () => {
    setTimeout(() => {
      setScanned(false);
      qrLock.current = false;
    }, 1000);
  };

  const closeAll = () => {
    setConfirmVisible(false);
    onClose();
    resetScanner();
  };

  if (!permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.centered}>
          <Text style={{ marginBottom: 16 }}>Camera permission is required.</Text>
          <Button title="Grant Permission" onPress={requestPermission} />
          <View style={{ height: 10 }} />
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
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />

        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#fff', marginTop: 8 }}>Processing...</Text>
          </View>
        )}

        <Button title="Close" onPress={onClose} />
        <Text style={styles.text}>Scan a friend’s QR code</Text>
      </View>

      {/* Confirmation modal */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Add Friend?</Text>
            <Text style={styles.detailText}>
              👤 {friendInfo?.firstName} {friendInfo?.lastName}
            </Text>
            <Text style={styles.detailText}>📧 {friendInfo?.email}</Text>
            <Text style={styles.detailText}>📱 {friendInfo?.contact}</Text>
            <Text style={styles.detailText}>🌍 {friendInfo?.country}</Text>

            <View style={styles.confirmButtons}>
              <Button title="Add Friend" onPress={handleAddFriend} />
              <Button title="Cancel" onPress={closeAll} color="red" />
            </View>
          </View>
        </View>
      </Modal>
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  confirmBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  confirmBox: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 5,
  },
  confirmTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  detailText: { fontSize: 16, marginVertical: 4, color: '#333' },
  confirmButtons: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 16 },
});
