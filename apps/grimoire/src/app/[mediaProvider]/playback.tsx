import { useEvent } from "expo";
import { useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { StyleSheet, View } from "react-native";

export type PlaybackScreenParams = {
  videoSource: string;
};

export default function Playback() {
  const { videoSource } = useLocalSearchParams<PlaybackScreenParams>();

  const player = useVideoPlayer(videoSource, (player) => {
    player.play();
  });

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  return (
    <View style={styles.video}>
      <VideoView
        style={styles.video}
        player={player}
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
        nativeControls={false}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: "#000000",
    flex: 1,
    width: "100%",
    height: "100%",
  },
  video: {
    backgroundColor: "#000000",
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
