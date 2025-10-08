import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator } from 'react-native';
import { db } from '../FirebaseConfig';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const FriendList = forwardRef((props, ref) => {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'friendships'));
      const arr: any[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        let friendId = null;
        if (data.userA === user.uid) friendId = data.userB;
        else if (data.userB === user.uid) friendId = data.userA;
        if (!friendId) return;
        arr.push({ friendUid: friendId });
      });

      // Fetch friend profiles
      const friendsWithInfo = await Promise.all(
        arr.map(async f => {
          const userDoc = await getDoc(doc(db, 'users', f.friendUid));
          return { ...f, friendInfo: userDoc.data() };
        })
      );

      setFriends(friendsWithInfo);
    } catch (err) {
      console.log(err);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({ refresh: fetchFriends }));

  useEffect(() => {
    fetchFriends();
  }, [user]);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  if (friends.length === 0)
    return <View style={styles.container}><Text>No friends found.</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friend List</Text>
      <FlatList
        data={friends}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              {item.friendInfo?.firstName || 'Unknown'} {item.friendInfo?.lastName || ''}
            </Text>
            <Text>Email: {item.friendInfo?.email || '-'}</Text>
            <Text>Contact: {item.friendInfo?.contact || '-'}</Text>
            <Text>User ID: {item.friendUid}</Text>
          </View>
        )}
      />
    </View>
  );
});

export default FriendList;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  card: { backgroundColor: '#f5f5f5', padding: 16, borderRadius: 10, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  name: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
});
