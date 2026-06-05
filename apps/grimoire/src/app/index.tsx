import ScreenWrapper from "@/components/ScreenWapper";
import { useConduit } from "@/contexts/ConduitContext";
import { useSnackbar } from "@/contexts/SnackbarContext";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";
import { mediaProviderMock } from "@/utils/media-provider-mock";
import type { MediaProviderMetadata } from "@grimoire/conduit";
import { useRouter } from "expo-router";
import { FlatList, Platform, View } from "react-native";
import { Avatar, Button, Card, Text } from "react-native-paper";

export default function Index() {
  const { spacing } = useScreenDimensions();
  const { showSnackbar } = useSnackbar();
  const { providers, installProvider, uninstallProvider } = useConduit();
  const router = useRouter();

  const handleInstall = async () => {
    try {
      const provider = await installProvider(JSON.stringify(mediaProviderMock));
      showSnackbar(`已安装: ${provider.name} (${provider.namespace})`);
    } catch (e) {
      console.log(e);
      const msg = e instanceof Error ? e.message : "未知错误";
      showSnackbar(`安装失败: ${msg}`);
    }
  };

  const handleUninstall = (namespace: string) => {
    showSnackbar(`确定要卸载 "${namespace}" 吗？`, 7_000, {
      label: "卸载",
      onPress: () => uninstallProvider(namespace),
    });
  };

  if (providers.length === 0) {
    return (
      <ScreenWrapper>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Text variant="bodyLarge">暂无媒体提供者</Text>
          <Button onPress={() => handleInstall()}>
            <Text variant="bodyLarge" style={{ color: "#007AFF" }}>
              安装提供者
            </Text>
          </Button>
        </View>
      </ScreenWrapper>
    );
  }

  const columns = Platform.isTV || Platform.OS === "web" ? 3 : 1;

  const renderItem = ({ item }: { item: MediaProviderMetadata }) => (
    <View
      style={{
        flex: 1 / columns,
        maxWidth: columns > 1 ? `${100 / columns}%` : "100%",
        padding: 16,
      }}
    >
      <Card
        mode="elevated"
        elevation={3}
        onPress={() => {
          router.push(`/${item.namespace}/explore`);
        }}
        onLongPress={() => handleUninstall(item.namespace)}
      >
        <Card.Title
          title={item.name}
          subtitle={item.namespace}
          key={item.namespace}
          left={() => <Avatar.Icon size={48} icon="folder" />}
        />
      </Card>
    </View>
  );

  return (
    <ScreenWrapper>
      <View style={{ padding: spacing.two }}>
        <Text variant="displayLarge" style={{ padding: spacing.one }}>
          媒体源
        </Text>
        <FlatList
          data={providers}
          keyExtractor={(item) => item.namespace}
          renderItem={renderItem}
          numColumns={columns}
        />
      </View>
    </ScreenWrapper>
  );
}
