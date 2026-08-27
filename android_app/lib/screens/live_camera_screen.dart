import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:object_detection/object_detection.dart';

/// Full-screen live camera capture with an on-device object-detection
/// overlay — a framing aid only. The detector recognizes 80 general COCO
/// classes (person, car, dog, traffic light, ...), not civic-issue
/// categories — there's no "pothole"/"garbage"/"streetlight" class in any
/// off-the-shelf model, so this never claims to identify the actual issue.
/// The real classification stays server-side (Gemini Vision via the Genkit
/// flow), unchanged, once the photo is captured and analyzed.
class LiveCameraScreen extends StatefulWidget {
  const LiveCameraScreen({super.key});

  @override
  State<LiveCameraScreen> createState() => _LiveCameraScreenState();
}

class _LiveCameraScreenState extends State<LiveCameraScreen> {
  CameraController? _controller;
  ObjectDetector? _detector;
  List<DetectedObject> _detections = [];
  Size? _lastImageSize;
  bool _processingFrame = false;
  bool _capturing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _setup();
  }

  Future<void> _setup() async {
    try {
      final cameras = await availableCameras();
      final back = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        back,
        ResolutionPreset.high,
        enableAudio: false,
      );
      await controller.initialize();
      if (!mounted) return;

      final detector = await ObjectDetector.create();

      setState(() {
        _controller = controller;
        _detector = detector;
      });

      await controller.startImageStream(_onFrame);
    } catch (e) {
      setState(() => _error = 'Could not open camera: $e');
    }
  }

  Future<void> _onFrame(CameraImage image) async {
    final controller = _controller;
    final detector = _detector;
    if (controller == null || detector == null || _processingFrame) return;
    _processingFrame = true;
    try {
      final rotation = rotationForFrame(
        width: image.width,
        height: image.height,
        sensorOrientation: controller.description.sensorOrientation,
        isFrontCamera: false,
        deviceOrientation: controller.value.deviceOrientation,
      );
      final swapped = rotation == CameraFrameRotation.cw90 || rotation == CameraFrameRotation.cw270;
      final imageSize = swapped
          ? Size(image.height.toDouble(), image.width.toDouble())
          : Size(image.width.toDouble(), image.height.toDouble());

      final results = await detector.detectFromCameraImage(
        image,
        rotation: rotation,
        options: const ObjectDetectorOptions(scoreThreshold: 0.5, maxResults: 5),
        maxDim: 640,
      );
      if (!mounted) return;
      setState(() {
        _detections = results;
        _lastImageSize = imageSize;
      });
    } catch (_) {
      // A missed frame isn't worth surfacing — the next one will retry.
    } finally {
      _processingFrame = false;
    }
  }

  Future<void> _capture() async {
    final controller = _controller;
    if (controller == null || _capturing) return;
    setState(() => _capturing = true);
    try {
      await controller.stopImageStream();
      final photo = await controller.takePicture();
      if (!mounted) return;
      Navigator.of(context).pop(photo);
    } catch (e) {
      setState(() {
        _error = 'Could not take photo: $e';
        _capturing = false;
      });
    }
  }

  @override
  void dispose() {
    final controller = _controller;
    if (controller != null && controller.value.isStreamingImages) {
      controller.stopImageStream();
    }
    controller?.dispose();
    _detector?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Report an Issue'),
      ),
      body: SafeArea(
        child: _error != null
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Colors.white),
                    textAlign: TextAlign.center,
                  ),
                ),
              )
            : controller == null || !controller.value.isInitialized
                ? const Center(child: CircularProgressIndicator())
                : Column(
                    children: [
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Text(
                          "Detecting objects in frame to help you focus — this "
                          "doesn't identify the issue itself, that happens after "
                          "you take the photo.",
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      Expanded(
                        child: ObjectDetectionCameraOverlay(
                          cameraPreview: CameraPreview(controller),
                          // Inverted: `controller.value.aspectRatio` is
                          // reported in the sensor's landscape terms, but the
                          // UI here is portrait — confirmed empirically (the
                          // uninverted ratio rendered the preview as a thin
                          // horizontal strip instead of filling the screen).
                          displayAspectRatio: 1 / controller.value.aspectRatio,
                          mirrorHorizontally: false,
                          detections: _detections,
                          imageSize: _lastImageSize,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: FloatingActionButton.large(
                          onPressed: _capturing ? null : _capture,
                          child: _capturing
                              ? const CircularProgressIndicator()
                              : const Icon(Icons.camera_alt),
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }
}
