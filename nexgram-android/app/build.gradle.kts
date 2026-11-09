plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ru.nexgram.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "ru.nexgram.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 352
        versionName = "1.7.2-native"
    }

    signingConfigs {
        create("release") {
            storeFile = file("../radar.jks")
            storePassword = "radar-radar"
            keyAlias = "radar"
            keyPassword = "radar-radar"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
        debug {
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.webkit:webkit:1.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
