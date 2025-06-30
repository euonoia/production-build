
import { StyleSheet, Text, View } from 'react-native';
import React from 'react';
import Information from '../auth/Information';
export default function Database() {
  return (
    <View style={styles.container}>
      <Information />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
});
