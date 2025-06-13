import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Image, Pressable } from "react-native";
import { icons } from "../../constants";
import { SafeAreaView } from "react-native-safe-area-context";
import DatesCard from "../../components/DatesCard";
import DatesCardGroup from "../../components/DatesCardGroup";
import { useGlobalContext } from "../../context/GlobalProvider";
import { updateRejectedUsers, getAllUsers } from "../../lib/appwrite";
import { router } from "expo-router";

const Home = () => {
  const { user: currentUser } = useGlobalContext();
  const [users, setUsers] = useState([]); // Array to store all available users
  const [rejectedUsers, setRejectedUsers] = useState(new Set()); // Set to track rejected user IDs
  const [likedUsers, setLikedUsers] = useState(new Set()); // Set to track liked user IDs
  const [currentIndex, setCurrentIndex] = useState(0);
  const [websocket, setWebSocket] = useState(null);
  const [showRejectOverlay, setShowRejectOverlay] = useState(false); // Show rejection overlay

  // Move to the next user
  const goToNextUser = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % users.length);
  };

  // Handle rejection
  const handleRejectPress = async () => {
    const rejectedUser = users[currentIndex];
    if (rejectedUser) {
      setRejectedUsers(prev => new Set([...prev, rejectedUser.userId])); // Add to rejected list

      // Show rejection overlay for 1 second
      setShowRejectOverlay(true);
      setTimeout(() => {
        setShowRejectOverlay(false);
        goToNextUser(); // Move to the next user after 1 second
      }, 1000);

      try {
        if (currentUser) {
          await updateRejectedUsers(currentUser.userId, rejectedUser.userId); // Update rejection in Appwrite
        }
      } catch (error) {
        console.error("Error updating rejected users:", error);
      }
    }
  };
  // Handle messaging and matching
  const handleMessagePress = async () => {
    try {
      if (!currentUser) throw new Error("No current user found");

      const selectedUser = users[currentIndex];
      if (selectedUser && currentUser.userId !== selectedUser.userId) {
        // Add to liked list if not matched already
        setLikedUsers(prev => new Set([...prev, selectedUser.userId]));

        let chatRoomId = await getChatRoomId(currentUser.userId, selectedUser.userId);
        if (!chatRoomId) {
          chatRoomId = await createChatRoom(currentUser.userId, selectedUser.userId);
        }

        if (chatRoomId) {
          router.push(`/chatDetailsScreen?chatRoomId=${chatRoomId}`);
          if (websocket) {
            websocket.send(JSON.stringify({ type: 'NEW_CHAT_ROOM', chatRoomId }));
          }
        } else {
          console.error("Failed to create chat room");
        }
      } else {
        console.log("Cannot match with yourself");
      }

      goToNextUser(); // Move to the next user
    } catch (error) {
      console.error("Error handling message press:", error);
    }
  };

  // Fetch users on mount and when rejected or liked users update
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getAllUsers();
        const filteredUsers = response.filter(
          user => !rejectedUsers.has(user.userId) && !likedUsers.has(user.userId)
        );
        setUsers(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();

    // WebSocket connection
    const ws = new WebSocket('ws://localhost:8080');
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWebSocket(ws);
    };
    ws.onmessage = (event) => {
      console.log('Message from server:', event.data);
    };
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWebSocket(null);
    };

    return () => {
      ws.close();
    };
  }, [rejectedUsers, likedUsers]);


  return (
    <SafeAreaView className="bg-secondary h-full ">
      

    <ScrollView className="bg-gray-300 ">
        <View className="mt-10">
        <DatesCardGroup />  
        </View> 

        <View className="flex-1 justify-center mx-3.5">
          {users[currentIndex] && (
            <DatesCard
              item={users[currentIndex]}
              handleClick={() => console.log('Card clicked')}
            />
          )}
        </View>
    </ScrollView>

       
          {showRejectOverlay && (
        <View style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "white", 
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1,
          opacity: 1,
          transition: "opacity 1s ease-out",
        }}>
          <Text style={{ fontSize: 100, color: "#5bb450" }}>X</Text>
        </View>
      )}
    
    <View className="flex-row justify-between px-3.5 bg-white" style={{ height: 80,marginBottom: -40}} >   
      <View className=" my-2.5 shadow-sm">
      <Pressable
        className="bg-[#1E2A30] rounded-xl flex-row items-center justify-center"
        onPress={handleRejectPress}
        style={{
          height: 55,
          width: 84,
        }}
      >  
        <Image 
        source={icons.rejection} 
        className="w-3 h-3"
      />
      </Pressable>
      </View>
     
    <View className=" my-2.5">
    <Pressable
      className="bg-secondary-200 rounded-xl flex-row items-center justify-center" 
      style={{ 
        height: 55,  
        width: 275,          // For iOS
        shadowColor: '#000', // Shadow color
        shadowOffset: { width: 0, height: 1 }, // Mimics the 0 1px offset
        shadowOpacity: 0.2, // Adjust opacity to your liking
        shadowRadius: 2, // Adjust radius for blur effect
        // For Android
        elevation: 2, // Set elevation for Android
      }}
      onPress={handleMessagePress}
    >
      <Image 
        source={icons.message} 
        resizeMode="contain"
        className="w-3 h-3"
      />
      <Text className="text-white text font-semibold">  Message</Text>
      </Pressable>
    </View>
  </View>
</SafeAreaView>
  );
};

export default Home;

