# Geração Android — Mercado App

O projeto é um aplicativo Expo/React Native configurado com o identificador Android `com.mercado.app`. A compilação local produz um APK instalável para testes internos; para distribuir atualizações ao público ou publicar na Google Play, use uma chave de assinatura de produção gerenciada de forma segura.

## APK de teste gerado

O APK de teste é criado pela tarefa abaixo:

```bash
cd android
./gradlew app:assembleRelease
```

O arquivo resultante é `android/app/build/outputs/apk/release/app-release.apk`. No ambiente de compilação, uma cópia é disponibilizada em `dist/Mercado-App-v1.0.0-release.apk`.

> A compilação local padrão usa o certificado de depuração do Android. Ela é apropriada para instalação e validação interna, mas não deve ser usada para publicação nem como chave permanente de atualização.

## Reproduzir a compilação local

Pré-requisitos: Node.js 18 ou superior, Java 17, Android SDK Platform 33 e Build Tools 33.0.2. A primeira compilação também pode baixar componentes Android adicionais requisitados pelas dependências.

```bash
npm ci
npx expo prebuild --platform android --clean
cd android
./gradlew app:assembleRelease
```

Após criar ou atualizar dependências nativas, execute novamente `npx expo prebuild --platform android --clean` antes do Gradle. A configuração e as dependências são verificadas com:

```bash
npx expo-doctor
```

## Distribuição assinada

Para gerar um APK de teste assinado por uma chave de produção ou um Android App Bundle (AAB) para a Google Play, utilize o EAS Build da Expo. O arquivo `eas.json` inclui os perfis `preview` e `production`:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

O perfil `preview` gera um APK para distribuição interna. Para a Play Store, execute:

```bash
npx eas-cli@latest build --platform android --profile production
```

O perfil `production` produz um AAB. No primeiro uso, configure uma chave Android de produção e mantenha uma cópia de segurança protegida. A chave define a identidade das futuras atualizações do aplicativo; perder essa chave pode impedir a publicação de novas versões com o mesmo identificador.

## Atualizações futuras

A cada atualização distribuída, incremente `expo.version` e `expo.android.versionCode` no `app.json`. O `versionCode` deve ser sempre maior do que o usado em qualquer versão anterior instalada ou enviada à Play Store.

## Referências

- [Expo: criação de binários Android](https://docs.expo.dev/build-reference/apk/)
- [Expo: fluxo de trabalho de pré-compilação](https://docs.expo.dev/workflow/prebuild/)
- [Android Developers: assinar o aplicativo](https://developer.android.com/studio/publish/app-signing)
