import 'package:cloud_firestore/cloud_firestore.dart';

class PartMaster {
  final String partNo;
  final String partName;

  PartMaster({required this.partNo, required this.partName});

  factory PartMaster.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return PartMaster(
      partNo: data['part_no'] ?? '',
      partName: data['part_name'] ?? '',
    );
  }
}
