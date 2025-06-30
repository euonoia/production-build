import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Modal } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import CameraModal from './CameraModal';

export default function FunctionCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [modalVisible, setModalVisible] = useState(false);

  const isPermissionGranted = Boolean(permission?.granted);

  return (
    <View style={styles.container}>
      <Pressable onPress={requestPermission} style={styles.button}>
        <Text>Request Camera Permission</Text>
      </Pressable>
      <Pressable
        disabled={!isPermissionGranted}
        style={[styles.button, !isPermissionGranted && { opacity: 0.5 }]}
        onPress={() => setModalVisible(true)}
      >
        <Text>Add Friend (Scan QR)</Text>
      </Pressable>
      <CameraModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  button: {
    backgroundColor: '#eee',
    padding: 16,
    margin: 12,
    borderRadius: 8,
  },
});