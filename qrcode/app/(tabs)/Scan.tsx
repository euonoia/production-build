import { StyleSheet, Button } from 'react-native';
import { Text, View } from '@/components/Themed';
import Scanner from '../auth/Scanner';
import React, { useState } from 'react';

export default function Scan () {
  const [visible, setVisible] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Scan QR Code</Text>
      <Scanner visible={visible} onClose={() => setVisible(false)} />
      {!visible && (
        <Button title="Open Scanner" onPress={() => setVisible(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
    },
});