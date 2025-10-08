import React, { useEffect, useRef, useState } from "react";
import { Modal, View, StyleSheet, Text, Button, Alert, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { db } from "../../FirebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

  const auth = getAuth();
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

  // -------- QR SCAN HANDLER ----------
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || qrLock.current) return;
    setScanned(true);
    qrLock.current = true;

    try {
      const parsed = JSON.parse(data);
      if (!parsed.userId) {
        Alert.alert("Invalid QR code format.");
        resetScanner();
        return;
      }

      if (!user) {
        Alert.alert("No user logged in.");
        resetScanner();
        return;
      }

      if (parsed.userId === user.uid) {
        Alert.alert("You can’t add yourself!");
        resetScanner();
        return;
      }

      // Temporarily store friend info for confirmation
      setFriendInfo(parsed);
      setConfirmVisible(true);
    } catch (error) {
      Alert.alert("Invalid QR code data.");
      resetScanner();
    }
  };

  // -------- ADD FRIEND HANDLER ----------
  const handleAddFriend = async () => {
    if (!friendInfo || !user) return;

    setLoading(true);
    try {
      const friendUid = friendInfo.userId;
      const friendDocRef = doc(db, "friend", `${user.uid}_${friendUid}`);
      const friendDoc = await getDoc(friendDocRef);

      if (friendDoc.exists()) {
        Alert.alert("This user is already your friend.");
        return;
      }

      await setDoc(friendDocRef, {
        userId: user.uid,
        friendUid,
        friendInfo,
        createdAt: new Date(),
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

  // -------- RESET & CLOSE HELPERS ----------
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

  // -------- CAMERA PERMISSION ----------
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

  // -------- MAIN CAMERA MODAL ----------
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />

        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: "#fff", marginTop: 8 }}>Processing...</Text>
          </View>
        )}

        <Button title="Close" onPress={onClose} />
        <Text style={styles.text}>Scan a friend’s QR code</Text>
      </View>

      {/* ---------- CONFIRMATION MODAL ---------- */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Add Friend?</Text>
            <Text style={styles.detailText}>👤 {friendInfo?.firstName} {friendInfo?.lastName}</Text>
            <Text style={styles.detailText}>📧 {friendInfo?.email}</Text>
            <Text style={styles.detailText}>📱 {friendInfo?.contact}</Text>

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
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  camera: { flex: 1, alignSelf: "stretch" },
  text: {
    fontSize: 18,
    textAlign: "center",
    margin: 16,
    color: "#333",
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  confirmBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  confirmBox: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    elevation: 5,
  },
  confirmTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  detailText: { fontSize: 16, marginVertical: 4, color: "#333" },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 16,
  },
});
