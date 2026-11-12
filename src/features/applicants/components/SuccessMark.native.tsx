import LottieView from "lottie-react-native";

export function SuccessMark() {
  return <LottieView source={require("../../../../assets/animations/checkout-success.json")} autoPlay loop={false} style={{ width: 120, height: 120 }} />;
}
