import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:myapp/models/sorting_log.dart';
import 'package:myapp/services/supabase_service.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:myapp/theme/app_colors.dart';
import 'dart:typed_data';
import 'dart:developer' as developer;
import 'package:myapp/services/notification_service.dart';
import 'package:share_plus/share_plus.dart';

class NgEntry {
  final TextEditingController typeController = TextEditingController();
  final TextEditingController operatorController = TextEditingController();
  File? image;

  void dispose() {
    typeController.dispose();
    operatorController.dispose();
  }
}

class QualityScanPage extends StatefulWidget {
  const QualityScanPage({super.key});

  @override
  State<QualityScanPage> createState() => _QualityScanPageState();
}

class _QualityScanPageState extends State<QualityScanPage> {
  final _formKey = GlobalKey<FormState>();
  final _partNoController = TextEditingController();
  final _partNameController = TextEditingController();
  final _supplierController = TextEditingController();
  final _factoryLocationController = TextEditingController();
  final List<TextEditingController> _operatorControllers = [TextEditingController()];
  final _quantitySortedController = TextEditingController();
  final _quantityNgController = TextEditingController();
  final _remarksController = TextEditingController();
  final _hourController = TextEditingController(text: DateTime.now().hour.toString().padLeft(2, '0'));

  final List<NgEntry> _ngEntries = [];
  final SupabaseService _supabaseService = SupabaseService();
  bool _isScanning = false;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _partNoController.dispose();
    _partNameController.dispose();
    _supplierController.dispose();
    _factoryLocationController.dispose();
    for (var controller in _operatorControllers) {
      controller.dispose();
    }
    _quantitySortedController.dispose();
    _quantityNgController.dispose();
    _remarksController.dispose();
    _hourController.dispose();
    for (var entry in _ngEntries) {
      entry.dispose();
    }
    super.dispose();
  }

  Future<void> _scanBarcode() async {
    setState(() {
      _isScanning = true;
    });
  }

  Future<void> _pickImage(NgEntry entry) async {
    final pickedFile = await ImagePicker().pickImage(source: ImageSource.camera);
    if (pickedFile != null) {
      setState(() {
        entry.image = File(pickedFile.path);
      });
    }
  }

  Future<String?> _uploadImage(File image) async {
    try {
      final bytes = await image.readAsBytes();
      final imageUrl = await _supabaseService.uploadImage(
        image.path,
        bytes,
        'rejected-parts',
      );
      return imageUrl;
    } catch (e) {
      developer.log('Error uploading image: $e');
      return null;
    }
  }

  void _addNgEntry() {
    setState(() {
      _ngEntries.add(NgEntry());
    });
  }

  void _removeNgEntry(int index) {
    setState(() {
      _ngEntries[index].dispose();
      _ngEntries.removeAt(index);
    });
  }

  void _submitLog() async {
    if (_formKey.currentState!.validate()) {
      // Validation: If NG Qty > 0, we must have NG entries
      int ngQty = int.tryParse(_quantityNgController.text) ?? 0;
      if (ngQty > 0 && _ngEntries.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('NG Quantity is > 0 but no Defect Details added.\nPlease add NG entries or set NG Qty to 0.'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      setState(() {
        _isSubmitting = true;
      });

      // Store these for later use
      Uint8List? pdfBytes;
      bool pdfGenerated = false;

      try {
        // STEP 1: Upload Images (with shorter timeout)
        developer.log('Step 1: Uploading NG images...');
        List<NgDetail> ngDetails = [];
        for (var entry in _ngEntries) {
          String? imageUrl;
          if (entry.image != null) {
            try {
              imageUrl = await _uploadImage(entry.image!);
            } catch (e) {
              developer.log('Image upload failed, continuing without URL: $e');
            }
          }
          ngDetails.add(NgDetail(
            type: entry.typeController.text,
            operatorName: entry.operatorController.text,
            imageUrl: imageUrl,
          ));
        }

        // STEP 2: Generate PDF (but don't wait for upload)
        developer.log('Step 2: Generating PDF...');
        try {
          pdfBytes = await _buildPdfBytes();
          pdfGenerated = true;
          developer.log('PDF generated successfully (${pdfBytes.length} bytes)');
        } catch (e) {
          developer.log('PDF generation failed: $e');
          pdfGenerated = false;
        }

        // STEP 3: Save to Supabase IMMEDIATELY (don't wait for PDF upload)
        developer.log('Step 3: Saving log to Supabase...');
        final finalLog = SortingLog(
          partNo: _partNoController.text,
          partName: _partNameController.text,
          quantitySorted: int.parse(_quantitySortedController.text),
          quantityNg: int.parse(_quantityNgController.text),
          supplier: _supplierController.text,
          factoryLocation: _factoryLocationController.text,
          operators: _operatorControllers.map((c) => c.text).where((t) => t.isNotEmpty).toList(),
          ngDetails: ngDetails,
          remarks: _remarksController.text,
          timestamp: DateTime.now(),
          pdfUrl: null, // We'll update this later if upload succeeds
        );

        // Save to Supabase first - this must succeed!
        final logId = await _supabaseService.addSortingLog(finalLog);
        developer.log('Log saved to Supabase with ID: $logId');

        // STEP 4: Try PDF upload in background (non-blocking)
        String? pdfUrl;
        bool pdfUploaded = false;
        
        if (pdfGenerated && pdfBytes != null) {
          try {
            developer.log('Step 4: Attempting PDF upload (non-blocking)...');
            
            final fileName = 'report_${_partNoController.text.replaceAll(RegExp(r'[^\w\s-]'), '_')}_${DateTime.now().millisecondsSinceEpoch}.pdf';
            
            // Upload PDF to Supabase Storage
            pdfUrl = await _supabaseService.uploadPdf(fileName, pdfBytes);
            
            if (pdfUrl != null) {
              pdfUploaded = true;
              developer.log('PDF uploaded successfully: $pdfUrl');
              
              // Update Supabase with PDF URL
              await _supabaseService.updatePdfUrl(logId, pdfUrl!);
              developer.log('Supabase updated with PDF URL');
            } else {
              pdfUploaded = false;
              developer.log('PDF upload failed - no URL returned');
            }
            
          } catch (e) {
            developer.log('PDF upload failed (non-critical): $e');
            pdfUploaded = false;
          }
        }

        // STEP 5: Show success regardless of PDF upload status
        if (mounted) {
          // Notification
          await NotificationService.showNotification(
            id: 1,
            title: 'Report Submitted ✅',
            body: 'QCSR for ${_partNoController.text} saved.' +
                (pdfUploaded ? ' PDF uploaded.' : ' PDF saved locally only.'),
          );

          // Show success dialog
          _showSuccessDialog(
            pdfBytes: pdfGenerated ? pdfBytes! : null,
            partNo: _partNoController.text,
            pdfUploadedToCloud: pdfUploaded,
            pdfGenerated: pdfGenerated,
          );
          
          _resetForm();
        }

      } catch (e, stackTrace) {
        developer.log('CRITICAL ERROR in submission', error: e, stackTrace: stackTrace);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error: ${e.toString()}'),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 5),
            ),
          );
        }
      } finally {
        if (mounted) {
          setState(() {
            _isSubmitting = false;
          });
        }
      }
    }
  }

  void _showSuccessDialog({
    required Uint8List? pdfBytes,
    required String partNo,
    required bool pdfUploadedToCloud,
    required bool pdfGenerated,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.primaryPurple.withOpacity(0.5)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primaryPurple.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle, color: AppColors.primaryPurple, size: 48),
              ),
              const SizedBox(height: 20),
              const Text(
                '✅ Submission Successful',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 12),
              Text(
                'Log saved to database successfully!',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.green, fontSize: 16, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 8),
              if (!pdfGenerated)
                const Text(
                  '⚠️ PDF generation failed',
                  style: TextStyle(color: Colors.orange, fontSize: 14),
                )
              else if (!pdfUploadedToCloud)
                const Text(
                  '⚠️ PDF cloud backup failed\n(PDF available for local sharing)',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.orange, fontSize: 14),
                )
              else
                const Text(
                  '✅ PDF uploaded to cloud',
                  style: TextStyle(color: Colors.green, fontSize: 14),
                ),
              const SizedBox(height: 28),
              if (pdfGenerated && pdfBytes != null)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      try {
                        await Printing.sharePdf(bytes: pdfBytes, filename: 'QCSR_Report_$partNo.pdf');
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Error sharing PDF: $e')),
                        );
                      }
                    },
                    icon: const Icon(Icons.share, color: Colors.white),
                    label: const Text('Share PDF', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                  ),
                ),
              if (pdfGenerated && pdfBytes != null) const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white70,
                    side: const BorderSide(color: Colors.white24),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Close', style: TextStyle(fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _resetForm() {
    _formKey.currentState!.reset();
    _partNoController.clear();
    _partNameController.clear();
    _supplierController.clear();
    _factoryLocationController.clear();
    
    for (var c in _operatorControllers) {
      c.dispose();
    }
    _operatorControllers.clear();
    _operatorControllers.add(TextEditingController());

    _quantitySortedController.clear();
    _quantityNgController.clear();
    _remarksController.clear();
    _hourController.text = DateTime.now().hour.toString().padLeft(2, '0');
    for (var entry in _ngEntries) {
      entry.dispose();
    }
    setState(() {
      _ngEntries.clear();
    });
  }

  Future<Uint8List> _buildPdfBytes() async {
    final pdf = pw.Document();

    List<pw.Widget> ngWidgets = [];
    for (var entry in _ngEntries) {
      final image = entry.image != null ? pw.MemoryImage(entry.image!.readAsBytesSync()) : null;
      ngWidgets.add(
        pw.Container(
          margin: const pw.EdgeInsets.only(bottom: 10),
          padding: const pw.EdgeInsets.all(5),
          decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.grey)),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text('NG Type: ${entry.typeController.text}'),
              pw.Text('Operator: ${entry.operatorController.text}'),
              if (image != null) pw.Container(height: 100, child: pw.Image(image)),
            ],
          ),
        ),
      );
    }

    pdf.addPage(
      pw.Page(
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text('Sorting Log Report', style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 20),
              pw.Text('Part Number: ${_partNoController.text}'),
              pw.Text('Part Name: ${_partNameController.text}'),
              pw.Text('Supplier: ${_supplierController.text}'),
              pw.Text('Total Quantity Sorted: ${_quantitySortedController.text}'),
              pw.Text('Quantity NG: ${_quantityNgController.text}'),
              pw.SizedBox(height: 10),
              pw.Text('Remarks: ${_remarksController.text}'),
              pw.SizedBox(height: 20),
              pw.Text('NG Details:', style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 10),
              ...ngWidgets,
            ],
          );
        },
      ),
    );

    return await pdf.save();
  }

  Future<void> _generateAndPreviewPdf() async {
    try {
      final pdfBytes = await _buildPdfBytes();
      await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdfBytes);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error generating PDF: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isScanning) {
      return Scaffold(
        appBar: AppBar(title: const Text('Scan Barcode')),
        body: MobileScanner(
          onDetect: (capture) {
            final Barcode barcode = capture.barcodes.first;
            if (barcode.rawValue != null) {
              _partNoController.text = barcode.rawValue!;
              _supabaseService.getPartName(barcode.rawValue!).then((partName) {
                if (partName != null) {
                  _partNameController.text = partName;
                }
              });
              setState(() {
                _isScanning = false;
              });
            }
          },
        ),
      );
    }

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        elevation: 0,
        title: const Text('QCSR - Quality Report', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf, color: Colors.white),
            onPressed: _generateAndPreviewPdf,
            tooltip: 'Generate PDF Report',
          ),
        ],
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Job Information Card
                  _buildModernSectionCard(
                    title: 'JOB INFORMATION',
                    icon: Icons.assignment_outlined,
                    color: Colors.indigo,
                    children: [
                      TextFormField(
                        controller: _partNoController,
                        decoration: InputDecoration(
                          labelText: 'Part Number',
                          prefixIcon: const Icon(Icons.numbers),
                          suffixIcon: IconButton(
                            icon: const Icon(Icons.qr_code_scanner),
                            onPressed: _scanBarcode,
                          ),
                        ),
                        validator: (value) => value!.isEmpty ? 'Enter Part Number' : null,
                      ),
                      TextFormField(
                        controller: _partNameController,
                        decoration: const InputDecoration(
                          labelText: 'Part Name',
                          prefixIcon: Icon(Icons.settings),
                        ),
                        validator: (value) => value!.isEmpty ? 'Enter Part Name' : null,
                      ),
                      TextFormField(
                        controller: _supplierController,
                        decoration: const InputDecoration(
                          labelText: 'Supplier Name',
                          prefixIcon: Icon(Icons.business),
                        ),
                        validator: (value) => value!.isEmpty ? 'Enter Supplier' : null,
                      ),
                      TextFormField(
                        controller: _factoryLocationController,
                        decoration: const InputDecoration(
                          labelText: 'Factory / Line Location',
                          prefixIcon: Icon(Icons.location_on),
                        ),
                        validator: (value) => value!.isEmpty ? 'Enter Location' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _hourController,
                        decoration: InputDecoration(
                          labelText: 'Hour (24-hour format)',
                          prefixIcon: const Icon(Icons.access_time, color: AppColors.primaryPurple),
                          helperText: 'Log entry for this specific hour',
                          helperStyle: const TextStyle(color: Colors.white60, fontSize: 11),
                        ),
                        keyboardType: TextInputType.number,
                        validator: (value) {
                          if (value!.isEmpty) return 'Enter hour';
                          int? hour = int.tryParse(value);
                          if (hour == null || hour < 0 || hour > 23) {
                            return 'Enter valid hour (0-23)';
                          }
                          return null;
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Operator Info Card
                  Card(
                    elevation: 0,
                    color: Theme.of(context).cardTheme.color,
                    shape: Theme.of(context).cardTheme.shape,
                    child: Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryPurple.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(Icons.group, color: AppColors.primaryPurple, size: 20),
                              ),
                              const SizedBox(width: 12),
                              const Text('OPERATOR INFO', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.primaryPurple, letterSpacing: 0.5)),
                            ],
                          ),
                          const SizedBox(height: 16),
                          ..._operatorControllers.asMap().entries.map((entry) {
                            int idx = entry.key;
                            var controller = entry.value;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12.0),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      controller: controller,
                                      style: const TextStyle(color: Colors.white),
                                      decoration: InputDecoration(
                                        labelText: 'Operator ${idx + 1} Name',
                                        labelStyle: const TextStyle(color: Colors.white70),
                                        prefixIcon: const Icon(Icons.person_outline, color: AppColors.primaryPurple),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: BorderSide(color: Colors.white.withOpacity(0.3)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: AppColors.primaryPurple, width: 2),
                                        ),
                                      ),
                                      validator: (value) => value!.isEmpty ? 'Enter name' : null,
                                    ),
                                  ),
                                  if (_operatorControllers.length > 1)
                                    IconButton(
                                      icon: const Icon(Icons.remove_circle_outline, color: Colors.redAccent),
                                      onPressed: () {
                                        setState(() {
                                          controller.dispose();
                                          _operatorControllers.removeAt(idx);
                                        });
                                      },
                                    ),
                                ],
                              ),
                            );
                          }),
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: () {
                                setState(() {
                                  _operatorControllers.add(TextEditingController());
                                });
                              },
                              icon: const Icon(Icons.person_add_outlined),
                              label: const Text('Add Another Operator'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.primaryPurple,
                                side: const BorderSide(color: AppColors.primaryPurple),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Production Volume
                  _buildModernSectionCard(
                    title: 'PRODUCTION VOLUME',
                    icon: Icons.inventory_2_outlined,
                    color: Colors.green,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _quantitySortedController,
                              decoration: InputDecoration(
                                labelText: 'Total Sorted',
                                prefixIcon: const Icon(Icons.check_circle_outline, color: Colors.green),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(color: Colors.grey.shade300),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(color: Colors.grey.shade300),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Colors.green, width: 2),
                                ),
                              ),
                              keyboardType: TextInputType.number,
                              validator: (value) => value!.isEmpty ? 'Enter Qty' : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _quantityNgController,
                              decoration: InputDecoration(
                                labelText: 'Total NG',
                                prefixIcon: const Icon(Icons.report_problem_outlined, color: Colors.orange),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(color: Colors.grey.shade300),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(color: Colors.grey.shade300),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Colors.orange, width: 2),
                                ),
                              ),
                              keyboardType: TextInputType.number,
                              validator: (value) => value!.isEmpty ? 'Enter Qty' : null,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // NG Details Section
                  Container(
                    padding: const EdgeInsets.all(16),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.withOpacity(0.3), width: 1),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.new_releases_outlined, color: Colors.red, size: 20),
                        ),
                        const SizedBox(width: 12),
                        const Text('NG DEFECT DETAILS', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.red, letterSpacing: 0.5)),
                      ],
                    ),
                  ),
                  
                  ..._ngEntries.asMap().entries.map((entry) {
                    int index = entry.key;
                    NgEntry detail = entry.value;
                    return Card(
                      elevation: 0,
                      margin: const EdgeInsets.only(bottom: 16),
                      color: const Color(0xFF2D3561),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: Colors.redAccent.withOpacity(0.5), width: 1),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20.0),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.red.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text('ENTRY #${index + 1}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red, fontSize: 13)),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                                  onPressed: () => _removeNgEntry(index),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: detail.typeController,
                              decoration: InputDecoration(
                                labelText: 'Defect Type',
                                prefixIcon: const Icon(Icons.error_outline, color: Colors.red),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(color: Colors.grey.shade300),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(color: Colors.grey.shade300),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Colors.red, width: 2),
                                ),
                              ),
                              validator: (value) => value!.isEmpty ? 'Enter NG Type' : null,
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: detail.operatorController,
                              decoration: InputDecoration(
                                labelText: 'Inspector Name',
                                prefixIcon: const Icon(Icons.manage_accounts_outlined, color: Colors.red),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(color: Colors.grey.shade300),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(color: Colors.grey.shade300),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: Colors.red, width: 2),
                                ),
                              ),
                              validator: (value) => value!.isEmpty ? 'Enter Name' : null,
                            ),
                            const SizedBox(height: 12),
                            detail.image != null
                                ? ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: Stack(
                                      children: [
                                        Image.file(detail.image!, height: 180, width: double.infinity, fit: BoxFit.cover),
                                        Positioned(
                                          right: 8,
                                          top: 8,
                                          child: CircleAvatar(
                                            backgroundColor: Colors.black54,
                                            radius: 18,
                                            child: IconButton(
                                              icon: const Icon(Icons.close, color: Colors.white, size: 18),
                                              onPressed: () => setState(() => detail.image = null),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  )
                                : Container(
                                    height: 100,
                                    width: double.infinity,
                                    decoration: BoxDecoration(
                                      color: Colors.grey.shade50,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: Colors.grey.shade200),
                                    ),
                                    child: const Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.add_a_photo_outlined, size: 32, color: Colors.grey),
                                        SizedBox(height: 4),
                                        Text('No Photo Attached', style: TextStyle(color: Colors.grey, fontSize: 12)),
                                      ],
                                    ),
                                  ),
                            const SizedBox(height: 8),
                            OutlinedButton.icon(
                              onPressed: () => _pickImage(detail),
                              icon: const Icon(Icons.camera_alt_outlined),
                              label: Text(detail.image == null ? 'Attach Defect Photo' : 'Change Photo'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.white,
                                side: BorderSide(color: Colors.redAccent.withOpacity(0.5), width: 1.5),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  
                  if (_ngEntries.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(16),
                      margin: const EdgeInsets.only(bottom: 16),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: const Text(
                        "No Defect Details Recorded.\n(If NG Qty is 0, this is correct)",
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white54, fontStyle: FontStyle.italic),
                      ),
                    ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: _addNgEntry,
                    icon: const Icon(Icons.add_circle_outline),
                    label: const Text('Add Another NG Entry'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: BorderSide(color: Colors.redAccent.withOpacity(0.5), width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Remarks
                  _buildModernSectionCard(
                    title: 'ADDITIONAL REMARKS',
                    icon: Icons.note_alt_outlined,
                    color: Colors.blueGrey,
                    children: [
                      TextFormField(
                        controller: _remarksController,
                        decoration: InputDecoration(
                          hintText: 'Enter any additional notes or findings here...',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade300),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade300),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Colors.blueGrey, width: 2),
                          ),
                        ),
                        maxLines: 4,
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),

                  // Submit Button
                  Container(
                    height: 64,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [AppColors.primaryPurple, AppColors.darkAccent],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(color: AppColors.primaryPurple.withOpacity(0.4), blurRadius: 12, offset: const Offset(0, 6)),
                      ],
                    ),
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitLog,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _isSubmitting
                          ? const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 3,
                                    valueColor: AlwaysStoppedAnimation(Colors.white),
                                  ),
                                ),
                                SizedBox(width: 12),
                                Text('SUBMITTING...', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                              ],
                            )
                          : const Text('COMPLETE & SUBMIT LOG', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black, letterSpacing: 1.2)),
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
          if (_isSubmitting)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 60,
                      height: 60,
                      child: CircularProgressIndicator(
                        strokeWidth: 5,
                        valueColor: AlwaysStoppedAnimation(AppColors.primaryPurple),
                      ),
                    ),
                    SizedBox(height: 20),
                    Text(
                      'Submitting Report...',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Please wait...',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildModernSectionCard({required String title, required IconData icon, required Color color, required List<Widget> children}) {
    return Card(
      elevation: 0,
      color: Theme.of(context).cardTheme.color,
      shape: Theme.of(context).cardTheme.shape,
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                const SizedBox(width: 12),
                Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.primaryPurple, letterSpacing: 0.5)),
              ],
            ),
            const SizedBox(height: 20),
            ...children,
          ],
        ),
      ),
    );
  }
}

class TimeoutException implements Exception {
  final String message;
  TimeoutException(this.message);
  
  @override
  String toString() => message;
}