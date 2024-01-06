import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import DocumentPicker from "react-native-document-picker";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Image } from "react-native-elements";

interface AvatarProps {
  size: number;
  url: string | null;
  onUpload: (filePath: string) => void;
}

export default function Avatar({ url, size, onUpload }: AvatarProps) {
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarDimensions = { width: size, height: size };

  async function downloadFile(path: string) {
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .download(path);

      if (error) throw error;

      const fileReader = new FileReader();
      fileReader.readAsDataURL(data);
      fileReader.onload = () => setAvatarUrl(fileReader.result as string);
    } catch (error) {
      if (error instanceof Error)
        console.log("Error downloading file: ", error.message);
    }
  }

  async function uploadAvatar() {
    try {
      setLoading(true);

      const file = await DocumentPicker.pickSingle({
        presentationStyle: "fullScreen",
        copyTo: "cachesDirectory",
        type: DocumentPicker.types.images,
        mode: "open",
      });

      const photo = {
        uri: file.fileCopyUri,
        type: file.type,
        name: file.name,
      };

      const formData = new FormData();
      formData.append("file", JSON.stringify(photo));

      const fileExt = file.name?.split(".").pop();
      const filePath = `${Math.random()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, formData);

      if (error) throw error;
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        console.warn("Cancelled");
      } else if (DocumentPicker.isInProgress(error)) {
        console.warn(
          "Multiple pickers were opened, only the last will be choosed"
        );
      } else if (error instanceof Error) {
        Alert.alert(error.message);
      } else throw error;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (url) downloadFile(url);
  }, [url]);

  return (
    <View>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          accessibilityLabel="Avatar"
          style={[avatarDimensions, styles.avatar, styles.image]}
        />
      ) : (
        <View style={[avatarDimensions, styles.avatar, styles.noImage]} />
      )}
      <View>
        <Button
          title={loading ? "Uploading ..." : "Upload"}
          onPress={uploadAvatar}
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 5,
    overflow: "hidden",
    maxWidth: "100%",
  },
  image: {
    objectFit: "cover",
    paddingTop: 0,
  },
  noImage: {
    backgroundColor: "#333",
    border: "1px solid rgb(200, 200, 200)",
    borderRadius: 5,
  },
});
