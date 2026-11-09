import { NotebookCell } from '../types';

export const HANDWRITTEN_EQUATION_SOLVER_CELLS: NotebookCell[] = [
  {
    "id": "hw-eq-cell-1",
    "type": "markdown",
    "content": "## Import libraries"
  },
  {
    "id": "hw-eq-cell-2",
    "type": "code",
    "content": "import numpy as np\nimport pandas as pd\nimport os\nimport random\nimport matplotlib.pyplot as plt\nimport seaborn as sns\nfrom sklearn.metrics import confusion_matrix\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.preprocessing import LabelEncoder\nimport tensorflow as tf\nfrom tensorflow.keras.models import Sequential\nfrom tensorflow.keras.layers import Conv2D,SimpleRNN, MaxPooling2D, Flatten, Dense, Dropout\nfrom tensorflow.keras.models import load_model\nfrom sklearn.preprocessing import LabelEncoder\nimport cv2\nfrom google.colab.patches import cv2_imshow"
  },
  {
    "id": "hw-eq-cell-3",
    "type": "code",
    "content": "def extractImages(datadir):\n    # Get the data\n    imagesData = []\n    imagesLabel = []\n    for folder in os.listdir(datadir):\n        path = os.path.join(datadir, folder)\n        for images in os.listdir(path):\n            img = cv2.imread(os.path.join(path, images), cv2.IMREAD_GRAYSCALE)\n            img = cv2.resize(img, (32, 32))\n            imagesData.append(img)\n            imagesLabel.append(folder)\n\n    combined = list(zip(imagesData, imagesLabel))\n    random.shuffle(combined)\n    imagesData, imagesLabel = zip(*combined)\n\n    return (imagesData, imagesLabel)"
  },
  {
    "id": "hw-eq-cell-4",
    "type": "markdown",
    "content": "## Loading the data"
  },
  {
    "id": "hw-eq-cell-5",
    "type": "code",
    "content": "!wget https://cainvas-static.s3.amazonaws.com/media/user_data/Yuvnish17/data.zip\n!unzip -qo data.zip",
    "output": "--2024-06-01 11:22:03--  https://cainvas-static.s3.amazonaws.com/media/user_data/Yuvnish17/data.zip\nResolving cainvas-static.s3.amazonaws.com (cainvas-static.s3.amazonaws.com)... 52.219.156.107, 52.219.156.67, 16.12.40.11, ...\nConnecting to cainvas-static.s3.amazonaws.com (cainvas-static.s3.amazonaws.com)|52.219.156.107|:443... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 28437489 (27M) [application/x-zip-compressed]\nSaving to: ‘data.zip’\n\ndata.zip            100%[===================>]  27.12M  8.35MB/s    in 3.2s    \n\n2024-06-01 11:22:07 (8.35 MB/s) - ‘data.zip’ saved [28437489/28437489]\n\n"
  },
  {
    "id": "hw-eq-cell-6",
    "type": "code",
    "content": "def download_csv(datadir):\n    imagesData = []\n    imagesLabel = []\n    for folder in os.listdir(datadir):\n        path = os.path.join(datadir, folder)\n        for image in os.listdir(path):\n            img = cv2.imread(os.path.join(path, image), cv2.IMREAD_GRAYSCALE)\n            img = cv2.resize(img, (32, 32))\n            img = img.flatten()\n            imagesData.append(img)\n            imagesLabel.append(folder)\n\n    combined = list(zip(imagesData, imagesLabel))\n    random.shuffle(combined)\n    imagesData, imagesLabel = zip(*combined)\n\n    return np.array(imagesData), np.array(imagesLabel)\n\ndata_dir = '/content/data/dataset'\n\nimagesData, imagesLabel = download_csv(data_dir)\n\nX = np.array(imagesData)\nX = X / 255.0\nY = np.array(imagesLabel)\ndf_X = pd.DataFrame(X)\ndf_X['label'] = Y\ndf_X.to_csv('data.csv', index=False)"
  },
  {
    "id": "hw-eq-cell-7",
    "type": "code",
    "content": "img=cv2.imread('/content/data/dataset/div/%_1_1.png')\ncv2_imshow(img)",
    "output": "<PIL.Image.Image image mode=RGB size=28x28>"
  },
  {
    "id": "hw-eq-cell-8",
    "type": "code",
    "content": "df=pd.read_csv('data.csv')\ndf.head()",
    "output": "     0    1    2    3    4    5    6    7    8    9  ...  1015  1016  1017  \\\n0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  ...   1.0   1.0   1.0   \n1  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  ...   1.0   1.0   1.0   \n2  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  ...   1.0   1.0   1.0   \n3  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  ...   1.0   1.0   1.0   \n4  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  ...   1.0   1.0   1.0   \n\n   1018  1019  1020  1021  1022  1023  label  \n0   1.0   1.0   1.0   1.0   1.0   1.0      6  \n1   1.0   1.0   1.0   1.0   1.0   1.0    div  \n2   1.0   1.0   1.0   1.0   1.0   1.0    sub  \n3   1.0   1.0   1.0   1.0   1.0   1.0      5  \n4   1.0   1.0   1.0   1.0   1.0   1.0      4  \n\n[5 rows x 1025 columns]"
  },
  {
    "id": "hw-eq-cell-9",
    "type": "code",
    "content": "imagesData = []\nimagesLabel = []\ndata_dir = '/content/data/dataset'\nimagesData, imagesLabel = extractImages(data_dir)\nprint(\"Number of images: \",len(imagesData))\nprint(\"Labels:\",list(set(imagesLabel)))",
    "output": "Number of images:  7600\nLabels: ['5', '4', '3', '6', '7', '1', '8', 'mul', 'div', 'add', '0', 'sub', '9', '2']\n"
  },
  {
    "id": "hw-eq-cell-10",
    "type": "code",
    "content": "import os\n\ndef count_images_in_folder(folder_path):\n    valid_image_extensions = {\".jpg\", \".png\"}\n\n    files = os.listdir(folder_path)\n\n    image_count = sum(1 for file in files if os.path.splitext(file)[1].lower() in valid_image_extensions)\n\n    return image_count\n\n\nfolders = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'add','sub','mul','div']\nimage_count={}\nfor i in folders:\n  folder_path = '/content/data/dataset/'+i\n  x = count_images_in_folder(folder_path)\n  image_count[i] = x\n  print(f'Number of images in the folder \"{folder_path}\": {x}')\n",
    "output": "Number of images in the folder \"/content/data/dataset/0\": 595\nNumber of images in the folder \"/content/data/dataset/1\": 562\nNumber of images in the folder \"/content/data/dataset/2\": 433\nNumber of images in the folder \"/content/data/dataset/3\": 541\nNumber of images in the folder \"/content/data/dataset/4\": 526\nNumber of images in the folder \"/content/data/dataset/5\": 433\nNumber of images in the folder \"/content/data/dataset/6\": 581\nNumber of images in the folder \"/content/data/dataset/7\": 533\nNumber of images in the folder \"/content/data/dataset/8\": 554\nNumber of images in the folder \"/content/data/dataset/9\": 546\nNumber of images in the folder \"/content/data/dataset/add\": 596\nNumber of images in the folder \"/content/data/dataset/sub\": 655\nNumber of images in the folder \"/content/data/dataset/mul\": 577\nNumber of images in the folder \"/content/data/dataset/div\": 468\n"
  },
  {
    "id": "hw-eq-cell-11",
    "type": "code",
    "content": "print(sum(list(image_count.values())))",
    "output": "7600\n"
  },
  {
    "id": "hw-eq-cell-12",
    "type": "code",
    "content": "folders = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'add', 'sub', 'mul', 'div']\nimages = []\n\nfor folder in folders:\n    folder_path = '/content/data/dataset/' + folder\n    image_files = os.listdir(folder_path)\n    if image_files:\n        random_image_file = random.choice(image_files)\n        image = cv2.imread(os.path.join(folder_path, random_image_file), cv2.IMREAD_GRAYSCALE)\n        image = cv2.resize(image, (32, 32))\n        images.append(image)\n\nimages = np.array(images)\nimages = images / 255.0\nimages = np.expand_dims(images, axis=-1)\n\n\n\nfig, axes = plt.subplots(3, 5, figsize=(15, 9))\naxes = axes.flatten()\n\nfor i, ax in enumerate(axes):\n    if i < len(images):\n        ax.imshow(images[i].squeeze(), cmap='gray')\n        ax.set_title(f\"{folders[i]}\")\n        ax.axis('off')\n    else:\n        ax.axis('off')\nplt.tight_layout()\nplt.show()",
    "output": "<Figure size 1500x900 with 15 Axes>"
  },
  {
    "id": "hw-eq-cell-13",
    "type": "code",
    "content": "plt.bar(image_count.keys(), image_count.values(), color='blue')\nplt.xlabel('Folders (Digits and Operators)')\nplt.ylabel('Number of Images')\nplt.title('Count of Images in Each Folder')\nplt.show()",
    "output": "<Figure size 640x480 with 1 Axes>"
  },
  {
    "id": "hw-eq-cell-14",
    "type": "code",
    "content": "def display_image(image, label):\n    plt.imshow(image, cmap='gray')\n    plt.title(f'Label: {label}')\n    plt.axis('off')\n    plt.show()\n\nprint(len(imagesLabel))\nx=int(input())\ndisplay_image(imagesData[x], imagesLabel[x])",
    "output": "7600\n8\n\n<Figure size 640x480 with 1 Axes>"
  },
  {
    "id": "hw-eq-cell-15",
    "type": "code",
    "content": "label_encoder = LabelEncoder()\ny = label_encoder.fit_transform(imagesLabel)"
  },
  {
    "id": "hw-eq-cell-16",
    "type": "code",
    "content": "label_mapping = {i: label for i, label in enumerate(label_encoder.classes_)}\nprint(label_mapping)",
    "output": "{0: '0', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'add', 11: 'div', 12: 'mul', 13: 'sub'}\n"
  },
  {
    "id": "hw-eq-cell-17",
    "type": "code",
    "content": "X=np.array(imagesData)\nY=np.array(y)\nX=X/255.0"
  },
  {
    "id": "hw-eq-cell-18",
    "type": "code",
    "content": "X.shape",
    "output": "(7600, 32, 32)"
  },
  {
    "id": "hw-eq-cell-19",
    "type": "code",
    "content": "X = np.expand_dims(X, axis=-1)\nX.shape",
    "output": "(7600, 32, 32, 1)"
  },
  {
    "id": "hw-eq-cell-20",
    "type": "code",
    "content": "X_train, X_test, y_train, y_test = train_test_split(X, Y, test_size=0.2, random_state=42)\n\nprint(f'Training set size: {len(X_train)}')\nprint(f'Testing set size: {len(X_test)}')",
    "output": "Training set size: 6080\nTesting set size: 1520\n"
  },
  {
    "id": "hw-eq-cell-21",
    "type": "code",
    "content": "len(np.unique(y))",
    "output": "14"
  },
  {
    "id": "hw-eq-cell-22",
    "type": "markdown",
    "content": "## CNN Model"
  },
  {
    "id": "hw-eq-cell-23",
    "type": "code",
    "content": "cnn_model=Sequential()\ncnn_model.add(Conv2D(64,(3,3),input_shape=(32,32,1),activation='relu'))\ncnn_model.add(MaxPooling2D((2, 2)))\ncnn_model.add(Conv2D(64, (3, 3), activation='relu'))\ncnn_model.add(MaxPooling2D((2, 2)))\ncnn_model.add(Conv2D(64, (3, 3), activation='relu'))\ncnn_model.add(MaxPooling2D((2, 2)))\ncnn_model.add(Dropout(0.5))\ncnn_model.add(Flatten())\ncnn_model.add(Dense(128, activation='relu'))\ncnn_model.add(Dense(14, activation='softmax'))\n\ncnn_model.summary()\n",
    "output": "Model: \"sequential_1\"\n_________________________________________________________________\n Layer (type)                Output Shape              Param #   \n=================================================================\n conv2d_3 (Conv2D)           (None, 30, 30, 64)        640       \n                                                                 \n max_pooling2d_3 (MaxPoolin  (None, 15, 15, 64)        0         \n g2D)                                                            \n                                                                 \n conv2d_4 (Conv2D)           (None, 13, 13, 64)        36928     \n                                                                 \n max_pooling2d_4 (MaxPoolin  (None, 6, 6, 64)          0         \n g2D)                                                            \n                                                                 \n conv2d_5 (Conv2D)           (None, 4, 4, 64)          36928     \n                                                                 \n max_pooling2d_5 (MaxPoolin  (None, 2, 2, 64)          0         \n g2D)                                                            \n                                                                 \n dropout_1 (Dropout)         (None, 2, 2, 64)          0         \n                                                                 \n flatten_1 (Flatten)         (None, 256)               0         \n                                                                 \n dense_2 (Dense)             (None, 128)               32896     \n                                                                 \n dense_3 (Dense)             (None, 14)                1806      \n                                                                 \n=================================================================\nTotal params: 109198 (426.55 KB)\nTrainable params: 109198 (426.55 KB)\nNon-trainable params: 0 (0.00 Byte)\n_________________________________________________________________\n"
  },
  {
    "id": "hw-eq-cell-24",
    "type": "code",
    "content": "cnn_model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['acc'])\ncnn_history = cnn_model.fit(X_train, y_train,epochs=30, validation_data=(X_test, y_test))",
    "output": "Epoch 1/30\n190/190 [==============================] - 15s 76ms/step - loss: 2.0170 - acc: 0.3324 - val_loss: 0.9832 - val_acc: 0.7020\nEpoch 2/30\n190/190 [==============================] - 15s 76ms/step - loss: 0.8992 - acc: 0.7164 - val_loss: 0.5667 - val_acc: 0.8230\nEpoch 3/30\n190/190 [==============================] - 15s 77ms/step - loss: 0.6354 - acc: 0.7998 - val_loss: 0.3939 - val_acc: 0.8875\nEpoch 4/30\n190/190 [==============================] - 15s 77ms/step - loss: 0.5013 - acc: 0.8382 - val_loss: 0.2901 - val_acc: 0.9230\nEpoch 5/30\n190/190 [==============================] - 15s 78ms/step - loss: 0.4158 - acc: 0.8674 - val_loss: 0.2568 - val_acc: 0.9217\nEpoch 6/30\n190/190 [==============================] - 15s 77ms/step - loss: 0.3575 - acc: 0.8845 - val_loss: 0.2154 - val_acc: 0.9434\nEpoch 7/30\n190/190 [==============================] - 14s 76ms/step - loss: 0.3250 - acc: 0.8974 - val_loss: 0.1973 - val_acc: 0.9467\nEpoch 8/30\n190/190 [==============================] - 14s 76ms/step - loss: 0.3004 - acc: 0.9081 - val_loss: 0.2063 - val_acc: 0.9421\nEpoch 9/30\n190/190 [==============================] - 17s 87ms/step - loss: 0.2801 - acc: 0.9140 - val_loss: 0.1545 - val_acc: 0.9533\nEpoch 10/30\n190/190 [==============================] - 15s 77ms/step - loss: 0.2447 - acc: 0.9230 - val_loss: 0.1567 - val_acc: 0.9507\nEpoch 11/30\n190/190 [==============================] - 14s 76ms/step - loss: 0.2252 - acc: 0.9289 - val_loss: 0.1467 - val_acc: 0.9592\nEpoch 12/30\n190/190 [==============================] - 15s 76ms/step - loss: 0.2151 - acc: 0.9275 - val_loss: 0.1147 - val_acc: 0.9658\nEpoch 13/30\n190/190 [==============================] - 14s 74ms/step - loss: 0.1983 - acc: 0.9347 - val_loss: 0.1634 - val_acc: 0.9428\nEpoch 14/30\n190/190 [==============================] - 14s 74ms/step - loss: 0.1915 - acc: 0.9388 - val_loss: 0.1142 - val_acc: 0.9645\nEpoch 15/30\n190/190 [==============================] - 14s 75ms/step - loss: 0.1787 - acc: 0.9434 - val_loss: 0.1128 - val_acc: 0.9671\nEpoch 16/30\n190/190 [==============================] - 15s 78ms/step - loss: 0.1669 - acc: 0.9465 - val_loss: 0.1403 - val_acc: 0.9566\nEpoch 17/30\n190/190 [==============================] - 15s 78ms/step - loss: 0.1613 - acc: 0.9493 - val_loss: 0.1122 - val_acc: 0.9691\nEpoch 18/30\n190/190 [==============================] - 15s 77ms/step - loss: 0.1517 - acc: 0.9484 - val_loss: 0.0898 - val_acc: 0.9730\nEpoch 19/30\n190/190 [==============================] - 15s 78ms/step - loss: 0.1527 - acc: 0.9495 - val_loss: 0.0938 - val_acc: 0.9691\nEpoch 20/30\n190/190 [==============================] - 15s 77ms/step - loss: 0.1352 - acc: 0.9559 - val_loss: 0.1017 - val_acc: 0.9651\nEpoch 21/30\n190/190 [==============================] - 17s 87ms/step - loss: 0.1485 - acc: 0.9503 - val_loss: 0.1190 - val_acc: 0.9632\nEpoch 22/30\n190/190 [==============================] - 14s 73ms/step - loss: 0.1281 - acc: 0.9566 - val_loss: 0.0805 - val_acc: 0.9763\nEpoch 23/30\n190/190 [==============================] - 14s 76ms/step - loss: 0.1293 - acc: 0.9604 - val_loss: 0.0899 - val_acc: 0.9704\nEpoch 24/30\n190/190 [==============================] - 15s 78ms/step - loss: 0.1090 - acc: 0.9623 - val_loss: 0.1098 - val_acc: 0.9625\nEpoch 25/30\n190/190 [==============================] - 15s 78ms/step - loss: 0.1205 - acc: 0.9617 - val_loss: 0.0870 - val_acc: 0.9711\nEpoch 26/30\n190/190 [==============================] - 15s 77ms/step - loss: 0.1064 - acc: 0.9646 - val_loss: 0.0969 - val_acc: 0.9697\nEpoch 27/30\n190/190 [==============================] - 14s 76ms/step - loss: 0.1112 - acc: 0.9640 - val_loss: 0.0941 - val_acc: 0.9737\nEpoch 28/30\n190/190 [==============================] - 15s 77ms/step - loss: 0.1083 - acc: 0.9633 - val_loss: 0.0888 - val_acc: 0.9724\nEpoch 29/30\n190/190 [==============================] - 15s 77ms/step - loss: 0.1034 - acc: 0.9664 - val_loss: 0.0661 - val_acc: 0.9776\nEpoch 30/30\n190/190 [==============================] - 15s 80ms/step - loss: 0.0977 - acc: 0.9671 - val_loss: 0.0771 - val_acc: 0.9757\n"
  },
  {
    "id": "hw-eq-cell-25",
    "type": "code",
    "content": "plt.plot(cnn_history.history['acc'])\nplt.plot(cnn_history.history['val_acc'])\nplt.title('Model Accuracy')\nplt.ylabel('Accuracy')\nplt.xlabel('Epoch')\nplt.legend(['Train', 'Test'], loc='best')\nplt.show()",
    "output": "<Figure size 640x480 with 1 Axes>"
  },
  {
    "id": "hw-eq-cell-26",
    "type": "code",
    "content": "loss, accuracy = cnn_model.evaluate(X_test, y_test)\nprint(f'Test accuracy of the loaded model: {accuracy * 100:.2f}%')",
    "output": "48/48 [==============================] - 1s 18ms/step - loss: 0.0771 - acc: 0.9757\nTest accuracy of the loaded model: 97.57%\n"
  },
  {
    "id": "hw-eq-cell-27",
    "type": "code",
    "content": "loss, accuracy = cnn_model.evaluate(X,y)\nprint(f'Accuracy of the model: {accuracy * 100:.2f}%')",
    "output": "238/238 [==============================] - 4s 17ms/step - loss: 0.0265 - acc: 0.9926\nAccuracy of the model: 99.26%\n"
  },
  {
    "id": "hw-eq-cell-28",
    "type": "code",
    "content": "print(y.shape)",
    "output": "(7600,)\n"
  },
  {
    "id": "hw-eq-cell-29",
    "type": "code",
    "content": "predictions = cnn_model.predict(X)\npredictions_flat = np.argmax(predictions, axis=1)",
    "output": "238/238 [==============================] - 6s 25ms/step\n"
  },
  {
    "id": "hw-eq-cell-30",
    "type": "code",
    "content": "cm = confusion_matrix(y, predictions_flat)\nplt.figure(figsize=(8, 6))\nsns.heatmap(cm, annot=True, fmt=\"d\", cmap=\"Blues\")\nplt.axis('off')\nplt.title(\"CNN Confusion Matrix\")\nplt.show()\n",
    "output": "<Figure size 800x600 with 2 Axes>"
  },
  {
    "id": "hw-eq-cell-31",
    "type": "code",
    "content": "cm = confusion_matrix(y, predictions_flat)\n\n# Print confusion matrix\nprint(\"Confusion Matrix:\")\nprint(cm)"
  },
  {
    "id": "hw-eq-cell-32",
    "type": "code",
    "content": "cnn_model.save('cnn_model.h5')",
    "output": "/usr/local/lib/python3.10/dist-packages/keras/src/engine/training.py:3103: UserWarning: You are saving your model as an HDF5 file via `model.save()`. This file format is considered legacy. We recommend using instead the native Keras format, e.g. `model.save('my_model.keras')`.\n  saving_api.save_model(\n"
  },
  {
    "id": "hw-eq-cell-33",
    "type": "code",
    "content": "from tensorflow.keras.models import load_model\ncnn_model = load_model('cnn_model.h5')"
  },
  {
    "id": "hw-eq-cell-34",
    "type": "code",
    "content": "folders = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'add', 'sub', 'mul', 'div']\nimages = []\n\nfor folder in folders:\n    folder_path = '/content/data/dataset/' + folder\n    image_files = os.listdir(folder_path)\n    if image_files:\n        random_image_file = random.choice(image_files)\n        image = cv2.imread(os.path.join(folder_path, random_image_file), cv2.IMREAD_GRAYSCALE)\n        image = cv2.resize(image, (32, 32))\n        images.append(image)\n\nimages = np.array(images)\nimages = images / 255.0\nimages = np.expand_dims(images, axis=-1)\n\npredictions = cnn_model.predict(images)\npredicted_labels = np.argmax(predictions, axis=1)\n\nfig, axes = plt.subplots(3, 5, figsize=(15, 9))\naxes = axes.flatten()\n\nfor i, ax in enumerate(axes):\n    if i < len(images):\n        ax.imshow(images[i].squeeze(), cmap='gray')\n        ax.set_title(f\"Acutal '{folders[i]}': Predicted as {label_mapping[predicted_labels[i]]}\")\n        ax.axis('off')\n    else:\n        ax.axis('off')\nplt.tight_layout()\nplt.show()",
    "output": "1/1 [==============================] - 0s 56ms/step\n\n<Figure size 1500x900 with 15 Axes>"
  },
  {
    "id": "hw-eq-cell-35",
    "type": "code",
    "content": "import cv2\nimport numpy as np\nimport matplotlib.pyplot as plt\nfrom tensorflow.keras.models import load_model  # type: ignore\n\nlabels = {0: '0', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '+', 11: '/', 12: '*', 13: '-'}\n\nmodel = load_model('cnn_model.h5')\n\ndef predict(image_path):\n    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)\n\n    _, binary_image = cv2.threshold(image, 128, 255, cv2.THRESH_BINARY_INV)\n\n    contours, _ = cv2.findContours(binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)\n\n    bounding_boxes = [cv2.boundingRect(contour) for contour in contours]\n    sorted_indices = sorted(range(len(bounding_boxes)), key=lambda i: bounding_boxes[i][0])\n    sorted_contours = [contours[i] for i in sorted_indices]\n\n    rois = []\n    padding = 15\n\n    for contour in sorted_contours:\n        x, y, w, h = cv2.boundingRect(contour)\n        x_start = max(0, x - padding)\n        y_start = max(0, y - padding)\n        x_end = min(image.shape[1], x + w + padding)\n        y_end = min(image.shape[0], y + h + padding)\n\n        roi = image[y_start:y_end, x_start:x_end]\n        roi = cv2.resize(roi, (32, 32))\n        rois.append(roi)\n\n    rois = np.array(rois)\n    rois = rois / 255.0\n    rois = np.expand_dims(rois, axis=-1)\n\n    predictions = model.predict(rois)\n    predicted_labels = np.argmax(predictions, axis=1)\n\n    image_color = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)\n    for i, contour in enumerate(sorted_contours):\n        x, y, w, h = cv2.boundingRect(contour)\n        label = labels[predicted_labels[i]]\n        cv2.rectangle(image_color, (x, y), (x+w, y+h), (0, 255, 0), 2)\n        cv2.putText(image_color, label, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)\n\n    plt.figure(figsize=(10, 10))\n    plt.imshow(cv2.cvtColor(image_color, cv2.COLOR_BGR2RGB))\n    plt.axis('off')\n    plt.show()\n\n    equation = ''.join(labels[predicted_labels[i]] for i in range(len(predicted_labels)))\n    print(f'Predicted equation: {equation}')\n    print(f'Result: {eval(equation)}')"
  },
  {
    "id": "hw-eq-cell-36",
    "type": "code",
    "content": "predict('test2.png')",
    "output": "1/1 [==============================] - 0s 30ms/step\n\n<Figure size 1000x1000 with 1 Axes>\nPredicted equation: 10-4\nResult: 6\n"
  },
  {
    "id": "hw-eq-cell-37",
    "type": "markdown",
    "content": "## RNN model"
  },
  {
    "id": "hw-eq-cell-38",
    "type": "code",
    "content": "rnn_model = Sequential()\nrnn_model.add(SimpleRNN(64, input_shape=(32, 32), activation='relu', return_sequences=True))\nrnn_model.add(SimpleRNN(64, activation='relu', return_sequences=True))\nrnn_model.add(SimpleRNN(64, activation='relu'))\nrnn_model.add(Dropout(0.5))\nrnn_model.add(Flatten())\nrnn_model.add(Dense(128, activation='relu'))\nrnn_model.add(Dense(14, activation='softmax'))\n\nrnn_model.summary()",
    "output": "Model: \"sequential_13\"\n_________________________________________________________________\n Layer (type)                Output Shape              Param #   \n=================================================================\n simple_rnn_48 (SimpleRNN)   (None, 32, 64)            6208      \n                                                                 \n simple_rnn_49 (SimpleRNN)   (None, 32, 64)            8256      \n                                                                 \n simple_rnn_50 (SimpleRNN)   (None, 64)                8256      \n                                                                 \n dropout_22 (Dropout)        (None, 64)                0         \n                                                                 \n flatten_2 (Flatten)         (None, 64)                0         \n                                                                 \n dense_12 (Dense)            (None, 128)               8320      \n                                                                 \n dense_13 (Dense)            (None, 14)                1806      \n                                                                 \n=================================================================\nTotal params: 32846 (128.30 KB)\nTrainable params: 32846 (128.30 KB)\nNon-trainable params: 0 (0.00 Byte)\n_________________________________________________________________\n"
  },
  {
    "id": "hw-eq-cell-39",
    "type": "code",
    "content": "rnn_model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['acc'])\nrnn_history = rnn_model.fit(X_train, y_train,epochs=30,validation_data=(X_test,y_test))",
    "output": "Epoch 1/30\n190/190 [==============================] - 10s 29ms/step - loss: 2.5937 - acc: 0.1104 - val_loss: 2.4177 - val_acc: 0.1632\nEpoch 2/30\n190/190 [==============================] - 6s 30ms/step - loss: 2.3089 - acc: 0.2044 - val_loss: 2.1401 - val_acc: 0.2809\nEpoch 3/30\n190/190 [==============================] - 5s 29ms/step - loss: 2.0693 - acc: 0.2757 - val_loss: 1.8304 - val_acc: 0.3651\nEpoch 4/30\n190/190 [==============================] - 5s 24ms/step - loss: 1.8540 - acc: 0.3433 - val_loss: 1.7100 - val_acc: 0.3875\nEpoch 5/30\n190/190 [==============================] - 6s 34ms/step - loss: 1.7172 - acc: 0.3964 - val_loss: 1.5053 - val_acc: 0.4408\nEpoch 6/30\n190/190 [==============================] - 5s 25ms/step - loss: 1.5748 - acc: 0.4400 - val_loss: 1.4741 - val_acc: 0.4572\nEpoch 7/30\n190/190 [==============================] - 5s 25ms/step - loss: 1.4843 - acc: 0.4798 - val_loss: 1.4243 - val_acc: 0.5072\nEpoch 8/30\n190/190 [==============================] - 7s 35ms/step - loss: 1.4072 - acc: 0.5089 - val_loss: 1.2261 - val_acc: 0.5691\nEpoch 9/30\n190/190 [==============================] - 5s 25ms/step - loss: 1.3395 - acc: 0.5426 - val_loss: 1.2867 - val_acc: 0.5717\nEpoch 10/30\n190/190 [==============================] - 6s 31ms/step - loss: 1.2279 - acc: 0.5831 - val_loss: 1.1782 - val_acc: 0.6026\nEpoch 11/30\n190/190 [==============================] - 7s 39ms/step - loss: 1.2169 - acc: 0.5908 - val_loss: 1.0904 - val_acc: 0.6257\nEpoch 12/30\n190/190 [==============================] - 5s 24ms/step - loss: 1.0365 - acc: 0.6451 - val_loss: 1.0692 - val_acc: 0.6368\nEpoch 13/30\n190/190 [==============================] - 6s 34ms/step - loss: 1.0546 - acc: 0.6375 - val_loss: 1.0351 - val_acc: 0.6368\nEpoch 14/30\n190/190 [==============================] - 5s 25ms/step - loss: 0.9793 - acc: 0.6633 - val_loss: 0.9700 - val_acc: 0.6559\nEpoch 15/30\n190/190 [==============================] - 6s 33ms/step - loss: 0.9672 - acc: 0.6719 - val_loss: 0.8323 - val_acc: 0.7151\nEpoch 16/30\n190/190 [==============================] - 5s 27ms/step - loss: 0.8926 - acc: 0.6929 - val_loss: 1.0558 - val_acc: 0.6526\nEpoch 17/30\n190/190 [==============================] - 5s 24ms/step - loss: 0.8813 - acc: 0.6923 - val_loss: 0.8094 - val_acc: 0.6961\nEpoch 18/30\n190/190 [==============================] - 7s 35ms/step - loss: 0.9868 - acc: 0.6584 - val_loss: 0.8027 - val_acc: 0.7138\nEpoch 19/30\n190/190 [==============================] - 5s 24ms/step - loss: 0.8138 - acc: 0.7155 - val_loss: 0.7851 - val_acc: 0.7184\nEpoch 20/30\n190/190 [==============================] - 5s 26ms/step - loss: 0.8325 - acc: 0.7094 - val_loss: 0.8258 - val_acc: 0.7296\nEpoch 21/30\n190/190 [==============================] - 6s 32ms/step - loss: 0.7737 - acc: 0.7262 - val_loss: 0.7317 - val_acc: 0.7250\nEpoch 22/30\n190/190 [==============================] - 5s 24ms/step - loss: 0.8379 - acc: 0.7158 - val_loss: 0.7578 - val_acc: 0.7263\nEpoch 23/30\n190/190 [==============================] - 6s 32ms/step - loss: 0.6765 - acc: 0.7479 - val_loss: 0.7891 - val_acc: 0.7138\nEpoch 24/30\n190/190 [==============================] - 5s 25ms/step - loss: 0.6659 - acc: 0.7594 - val_loss: 0.6488 - val_acc: 0.7757\nEpoch 25/30\n190/190 [==============================] - 5s 24ms/step - loss: 0.6988 - acc: 0.7518 - val_loss: 0.8508 - val_acc: 0.7000\nEpoch 26/30\n190/190 [==============================] - 7s 36ms/step - loss: 0.6773 - acc: 0.7579 - val_loss: 0.6005 - val_acc: 0.7849\nEpoch 27/30\n190/190 [==============================] - 5s 25ms/step - loss: 0.6154 - acc: 0.7768 - val_loss: 0.6202 - val_acc: 0.7796\nEpoch 28/30\n190/190 [==============================] - 5s 28ms/step - loss: 0.6462 - acc: 0.7646 - val_loss: 0.6515 - val_acc: 0.7711\nEpoch 29/30\n190/190 [==============================] - 6s 32ms/step - loss: 0.6857 - acc: 0.7599 - val_loss: 0.6659 - val_acc: 0.7632\nEpoch 30/30\n190/190 [==============================] - 5s 25ms/step - loss: 0.6499 - acc: 0.7673 - val_loss: 1.0640 - val_acc: 0.6441\n"
  },
  {
    "id": "hw-eq-cell-40",
    "type": "code",
    "content": "rnn_model.save('rnn_model.h5')",
    "output": "/usr/local/lib/python3.10/dist-packages/keras/src/engine/training.py:3103: UserWarning: You are saving your model as an HDF5 file via `model.save()`. This file format is considered legacy. We recommend using instead the native Keras format, e.g. `model.save('my_model.keras')`.\n  saving_api.save_model(\n"
  },
  {
    "id": "hw-eq-cell-41",
    "type": "code",
    "content": "plt.plot(rnn_history.history['acc'])\nplt.plot(rnn_history.history['val_acc'])\nplt.title('Model Accuracy')\nplt.ylabel('Accuracy')\nplt.xlabel('Epoch')\nplt.legend(['Train', 'Test'], loc='best')\nplt.show()",
    "output": "<Figure size 640x480 with 1 Axes>"
  },
  {
    "id": "hw-eq-cell-42",
    "type": "code",
    "content": "predictions = rnn_model.predict(X)\npredictions_flat = np.argmax(predictions, axis=1)\ncm = confusion_matrix(y, predictions_flat)\nplt.figure(figsize=(8, 6))\nsns.heatmap(cm, annot=True, fmt=\"d\", cmap=\"Blues\")\nplt.title(\"RNN Confusion Matrix\")\nplt.axis('off')\nplt.show()",
    "output": "238/238 [==============================] - 2s 9ms/step\n\n<Figure size 800x600 with 2 Axes>"
  },
  {
    "id": "hw-eq-cell-43",
    "type": "code",
    "content": "fig, axes = plt.subplots(1, 2, figsize=(18, 4))\n\naxes[0].plot(cnn_history.history['acc'], label='Training Accuracy')\naxes[0].plot(cnn_history.history['val_acc'], label='Validation Accuracy')\naxes[0].set_title('CNN Model Accuracy')\naxes[0].set_xlabel('Epoch')\naxes[0].set_ylabel('Accuracy')\naxes[0].legend(loc='best')\n\naxes[1].plot(rnn_history.history['acc'], label='Training Accuracy')\naxes[1].plot(rnn_history.history['val_acc'], label='Validation Accuracy')\naxes[1].set_title('RNN Model Accuracy')\naxes[1].set_xlabel('Epoch')\naxes[1].set_ylabel('Accuracy')\naxes[1].legend(loc='best')\n\nplt.show()\n",
    "output": "<Figure size 1800x400 with 2 Axes>"
  },
  {
    "id": "hw-eq-cell-44",
    "type": "markdown",
    "content": "## Conclusion\n\nIn conclusion, the handwritten equation solver utilizing deep learning techniques, including Convolutional Neural Networks (CNNs) and Recurrent Neural Networks (RNNs), has demonstrated promising accuracy levels. The CNN-based approach achieved an impressive accuracy of 97.57%, while the RNN-based method achieved a respectable accuracy of 76.32%.\n\nThe CNN model excelled in accurately recognizing and classifying individual handwritten characters within the equations. Its ability to effectively capture spatial hierarchies and local patterns in the input images contributed to its high accuracy. With its deep layers and convolutional operations, the CNN was capable of learning complex features directly from the pixel values, enabling robust classification of handwritten characters."
  }
];
