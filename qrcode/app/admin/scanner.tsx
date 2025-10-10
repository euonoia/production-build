import React, { useState } from 'react';
import { StyleSheet, Button, View } from 'react-native';
import Scanner from '../../components/scanneradmin';

export default function Qr() {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Button title="Open Scanner" onPress={() => setVisible(true)} />
      <Scanner visible={visible} onClose={() => setVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
