class NgDetail {
  final String type;
  final String operatorName;
  final String? imageUrl;

  NgDetail({
    required this.type,
    required this.operatorName,
    this.imageUrl,
  });

  factory NgDetail.fromJson(Map<String, dynamic> json) {
    return NgDetail(
      type: json['type'] ?? '',
      operatorName: json['operator_name'] ?? '',
      imageUrl: json['image_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'operator_name': operatorName,
      'image_url': imageUrl,
    };
  }
}

class SortingLog {
  final String? id;
  final String partNo;
  final String partName;
  final int quantitySorted;
  final int quantityNg;
  final String supplier;
  final String factoryLocation;
  final List<String> operators;
  final List<NgDetail> ngDetails;
  final String remarks;
  final DateTime timestamp;
  final String? pdfUrl;

  SortingLog({
    this.id,
    required this.partNo,
    required this.partName,
    required this.quantitySorted,
    required this.quantityNg,
    required this.supplier,
    required this.factoryLocation,
    required this.operators,
    required this.ngDetails,
    required this.remarks,
    required this.timestamp,
    this.pdfUrl,
  });

  factory SortingLog.fromJson(Map<String, dynamic> json, List<NgDetail> ngDetails) {
    return SortingLog(
      id: json['id'],
      partNo: json['part_no'] ?? '',
      partName: json['part_name'] ?? '',
      quantitySorted: json['quantity_sorted'] ?? 0,
      quantityNg: json['quantity_ng'] ?? 0,
      supplier: json['supplier'] ?? '',
      factoryLocation: json['factory_location'] ?? '',
      operators: (json['operators'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      ngDetails: ngDetails,
      remarks: json['remarks'] ?? '',
      timestamp: json['timestamp'] != null 
          ? DateTime.parse(json['timestamp']) 
          : DateTime.now(),
      pdfUrl: json['pdf_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'part_no': partNo,
      'part_name': partName,
      'quantity_sorted': quantitySorted,
      'quantity_ng': quantityNg,
      'supplier': supplier,
      'factory_location': factoryLocation,
      'operators': operators,
      'remarks': remarks,
      'timestamp': timestamp.toIso8601String(),
      'pdf_url': pdfUrl,
    };
  }
}
