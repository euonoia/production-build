import React, { createContext, useRef, ReactNode } from 'react';

type FriendContextType = {
  refreshFriends: () => void;
  setRefreshFriends: (fn: () => void) => void;
};

export const FriendContext = createContext<FriendContextType>({
  refreshFriends: () => {},
  setRefreshFriends: () => {},
});

export const FriendProvider = ({ children }: { children: ReactNode }) => {
  const refreshRef = useRef<() => void>(() => {});

  const setRefreshFriends = (fn: () => void) => {
    refreshRef.current = fn;
  };

  const refreshFriends = () => {
    refreshRef.current();
  };

  return (
    <FriendContext.Provider value={{ refreshFriends, setRefreshFriends }}>
      {children}
    </FriendContext.Provider>
  );
};
