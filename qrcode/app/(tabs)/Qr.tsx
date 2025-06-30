import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';
import Qrs from '../auth/AddQr';

export default function Qr() {
  return (
    <View style={styles.container}>
      <Qrs />
    </View>
  );
}

   
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});