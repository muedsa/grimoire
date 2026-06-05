import {
  createContext,
  useState,
  useContext,
  useCallback,
  PropsWithChildren,
} from "react";
import { Snackbar, Portal, SnackbarProps, Modal } from "react-native-paper";

type SnackbarContextType = {
  showSnackbar: (
    message: string,
    duration?: number,
    action?: SnackbarProps["action"],
  ) => void;
  hideSnackbar: () => void;
};

const SnackbarContext = createContext<SnackbarContextType | null>(null);

export function useSnackbar(): SnackbarContextType {
  const value = useContext(SnackbarContext);
  if (!value) {
    throw new Error(
      "useSnackbarContext must be wrapped in a <SnackbarProvider/>",
    );
  }
  return value;
}

export const SnackbarProvider = ({ children }: PropsWithChildren) => {
  const [snackbarState, setSnackbarState] = useState<{
    visible: boolean;
    message: string;
    duration: number;
    action: SnackbarProps["action"];
  }>({
    visible: false,
    message: "",
    duration: 3000,
    action: undefined,
  });

  const showSnackbar = useCallback(
    (message: string, duration?: number, action?: SnackbarProps["action"]) => {
      setSnackbarState({
        visible: true,
        message,
        duration: duration ?? 3000,
        action: action,
      });
    },
    [],
  );

  const hideSnackbar = useCallback(() => {
    setSnackbarState((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar, hideSnackbar }}>
      {children}
      <Portal>
        {Boolean(snackbarState.action) ? (
          <Modal
            visible={snackbarState.visible && Boolean(snackbarState.action)}
            onDismiss={hideSnackbar}
            contentContainerStyle={{ flex: 1 }}
          >
            <Snackbar
              visible={snackbarState.visible}
              onDismiss={hideSnackbar}
              duration={snackbarState.duration}
              action={snackbarState.action}
            >
              {snackbarState.message}
            </Snackbar>
          </Modal>
        ) : (
          <Snackbar
            visible={snackbarState.visible}
            onDismiss={hideSnackbar}
            duration={snackbarState.duration}
            action={snackbarState.action}
          >
            {snackbarState.message}
          </Snackbar>
        )}
      </Portal>
    </SnackbarContext.Provider>
  );
};
