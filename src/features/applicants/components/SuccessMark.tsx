import { View } from "react-native";
import { LineIcon } from "@/components/ui/line-icon";

export function SuccessMark() {
  return <View style={{ width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#10B981" }}><LineIcon name="check" size={48} color="#FFFFFF" /></View>;
}
