import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';
import Scann from '../auth/Scanner';
import React from 'react';


export default function Scan () {

  return (
    <View style={styles.container}>
     <Text style={styles.text}>Scan QR Code</Text>
      <Scann />
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