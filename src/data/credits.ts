// Ghi công các model / texture bên thứ ba dùng trong game (hiện ở Cài đặt → Ghi công).
// Bản đầy đủ kèm văn bản giấy phép: public/CREDITS.md + public/licenses/

export interface Credit {
  what: string
  author: string
  license: string
  url: string
  /** file văn bản giấy phép trong public/licenses */
  licenseFile?: string
  /** ghi chú giới hạn sử dụng */
  note?: string
}

export interface CreditGroup {
  title: string
  items: Credit[]
}

const POLYHAVEN = 'https://polyhaven.com/a/'
const INNERSCENE = 'https://www.innerscene.com/tools/library/3d-parts/'

export const CREDITS: CreditGroup[] = [
  {
    title: 'Phòng làm việc & đạo cụ (Poly Haven)',
    items: [
      ['Wooden Table 02', 'Serhii Khromov', 'wooden_table_02'],
      ['Shelf 01', 'Gabriel Radić', 'Shelf_01'],
      ['Screwdriver', 'PierreB3D', 'screwdriver'],
      ['Painted Wooden Chair 01', 'Kuutti Siitonen', 'painted_wooden_chair_01'],
      ['Hanging Picture Frame 01', 'James Ray Cock', 'hanging_picture_frame_01'],
      ['Wall Clock', 'PierreB3D', 'wall_clock'],
      ['Laminate Floor 02 (texture)', 'Dario Barresi, Charlotte Baglioni', 'laminate_floor_02'],
      ['Beige Wall 001 (texture)', 'Dimitrios Savva, Rico Cilliers', 'beige_wall_001'],
      ['Blue Metal Plate (texture)', 'Rob Tuytel', 'blue_metal_plate'],
      ['Oak Veneer 01 (vân gỗ sồi case)', 'Jenelle van Heerden', 'oak_veneer_01'],
      ['Walnut Veneer (vân gỗ óc chó case)', 'Jenelle van Heerden', 'walnut_veneer'],
    ].map(([what, author, id]) => ({ what, author, license: 'CC0', url: POLYHAVEN + id })),
  },
  {
    title: 'Ốc vít, hộp lò xo & kéo (Innerscene Free Parts Library)',
    items: [
      ['Countersunk screw M3 × 10', 'countersunk-screw-m3-x-10-4cdc4298'],
      ['Socket cap screw M2 × 6', 'socket-cap-screw-m2-x-6-77092786'],
      ['Button head screw M3 × 8', 'button-head-screw-m3-x-8-4332698d'],
      ['Print-in-place hinged clamshell', 'print-in-place-hinged-clamshell-ccb6f1e0'],
      ['Desk tray', 'desk-tray-original-3d-printable-816c70c6'],
      ['Loop scissors, stationery', 'loop-scissors-stationery-2c45aeb4'],
    ].map(([what, id]) => ({ what, author: 'Innerscene', license: 'CC0', url: INNERSCENE + id })),
  },
  {
    title: 'Case bàn phím',
    items: [
      {
        what: 'Bakeneko 60 (case)',
        author: '© 2020 kkatano',
        license: 'MIT',
        url: 'https://github.com/kkatano/bakeneko-60',
        licenseFile: 'bakeneko-60-MIT.txt',
      },
      {
        what: 'Blossom (case + PCB layout Alice)',
        author: '© 2021 DoughnutTheGuy',
        license: 'MIT',
        url: 'https://github.com/doughnut923/Blossom',
        licenseFile: 'blossom-MIT.txt',
      },
      {
        what: 'Planck (case, thiết kế OLKB)',
        author: 'MajorKoos / KBDParts',
        license: 'MIT',
        url: 'https://github.com/MajorKoos/KBDParts',
        licenseFile: 'kbdparts-planck-MIT.txt',
      },
      {
        what: 'Unified Daughterboard C3 (DTB + đầu JST SH 4 pin)',
        author: '© 2019 ai03',
        license: 'MIT',
        url: 'https://github.com/mraghuram3/Unified-Daughterboard',
        licenseFile: 'unified-daughterboard-MIT.txt',
      },
    ],
  },
  {
    title: 'Keycap profile (CAD 1u)',
    items: [
      {
        what: 'Cherry',
        author: '© 2017 Constantino Schillebeeckx',
        license: 'MIT',
        url: 'https://github.com/ConstantinoSchillebeeckx/cherry-mx-keycaps',
        licenseFile: 'cherry-mx-keycaps-MIT.txt',
      },
      {
        what: 'OEM',
        author: 'dankwookiee (Kieeboard)',
        license: 'CC BY 4.0',
        url: 'https://github.com/dankwookiee/Kieeboard',
        licenseFile: 'kieeboard-oem-CC-BY-4.0.txt',
        note: 'Đã chuyển STEP sang GLB',
      },
      {
        what: 'SA',
        author: '© 2015 getclacking',
        license: 'MIT',
        url: 'https://github.com/getclacking/SA-profile-keys-3D-models',
        licenseFile: 'sa-profile-keys-MIT.txt',
      },
      {
        what: 'DSA',
        author: '© 2020 Anh Thang',
        license: 'MIT',
        url: 'https://github.com/anhthang/dsa-keycap',
        licenseFile: 'dsa-keycap-MIT.txt',
      },
      {
        what: 'XDA',
        author: '© 2018 spooknik',
        license: 'MIT',
        url: 'https://github.com/spooknik/XDA-Keycaps',
        licenseFile: 'xda-keycaps-MIT.txt',
      },
      {
        what: 'MT3',
        author: 'Matt3o',
        license: 'CC BY-SA 4.0',
        url: 'https://matt3o.com/mt3-stl-files-for-artisan-keycap-designers/',
        note: 'Bản GLB chuyển đổi cũng theo CC BY-SA 4.0',
      },
      {
        what: 'OPK',
        author: 'cubiq',
        license: 'Apache 2.0',
        url: 'https://github.com/cubiq/OPK',
        licenseFile: 'opk-Apache-2.0.txt',
      },
    ],
  },
  {
    title: 'Đạo cụ bàn làm việc',
    items: [
      {
        what: 'Voxel Cutting Mat (tấm lót cắt dưới bàn phím)',
        author: 'shpawen',
        license: 'CC BY 4.0',
        url: 'https://sketchfab.com/3d-models/voxel-cutting-mat-85e51c02c3a747ee8394a9a6f163dec7',
      },
      {
        what: 'Chest_ Box_ Wooden_26_MB (rương gỗ bước mở hộp)',
        author: 'Mehdi Shahsavan',
        license: 'CC BY 4.0',
        url: 'https://sketchfab.com/3d-models/chest--box--wooden-26-mb-0a863f5790a44303b2d78d7d8b8b3646',
      },
      {
        what: 'Old Tool Box (hộp đồ nghề trên bàn)',
        author: 'Марк (Mark-kon)',
        license: 'CC BY 4.0',
        url: 'https://sketchfab.com/3d-models/old-tool-box-31b3d48ddc8f4b40a4099647fa016305',
      },
      {
        what: 'ZZ Plant in Ceramic Pot (chậu cây góc hành lang)',
        author: 'Jerovdl',
        license: 'CC BY 4.0',
        url: 'https://sketchfab.com/3d-models/zz-plant-in-ceramic-pot-crafted-by-jerovdl-544d4c1621254fa28144c2f1e27287a7',
      },
      {
        what: 'Window Blind - 3MB (rèm lá cửa sổ)',
        author: 'Mehdi Shahsavan',
        license: 'CC BY 4.0',
        url: 'https://sketchfab.com/3d-models/window-blind-3mb-b3a4224cc33a4bccbb61def648519b6b',
      },
      {
        what: 'Light Switch (công tắc đèn cạnh cửa)',
        author: 'Avot',
        license: 'CC BY 4.0',
        url: 'https://sketchfab.com/3d-models/light-switch-808c3de4dd874fc1b67ff15cd2645555',
      },
      {
        what: 'Light Fixture - Ceiling Recessed (đèn âm trần hành lang)',
        author: 'MozillaHubs',
        license: 'CC BY 4.0',
        url: 'https://sketchfab.com/3d-models/light-fixture-ceiling-recessed-269fd427629548a8a0949a6493c5b223',
      },
      {
        what: 'Electrical Wall Outlet (ổ cắm tường)',
        author: 'sacapuntas',
        license: 'CC BY 4.0',
        url: 'https://sketchfab.com/3d-models/electrical-wall-outlet-a19e89cfc54047bb965e1b3d6983301c',
      },
      {
        what: '[CC0] European Power Plug (phích CEE + đầu C13 dây nguồn máy tính)',
        author: 'Lara Sophie Schütt',
        license: 'CC BY 4.0',
        url: 'https://sketchfab.com/3d-models/cc0-european-power-plug-189d8288a0614781995221cf4c3e67a5',
      },
      {
        what: 'power plug (european) (phích dây đèn bàn)',
        author: 'ChoboiAssets',
        license: 'CC BY 4.0',
        url: 'https://sketchfab.com/3d-models/power-plug-european-4b73c69e083f43329491dff671721515',
      },
      {
        what: 'Electric Screwdriver_ Tool (tua vít điện)',
        author: 'MugoflighterfluidArt',
        license: 'CC BY 4.0',
        url: 'https://sketchfab.com/3d-models/electric-screwdriver--tool-427bce24c1af4750a969440d2f69c596',
        note: 'Đã gộp transform, xoay lại trục và thu cỡ',
      },
    ],
  },
  {
    title: 'Cọ và lọ lube',
    items: [
      {
        what: 'Round Brush đầu nhỏ (cọ lube)',
        author: 'Zsky',
        license: 'CC BY 4.0',
        url: 'https://poly.pizza/m/uqW0Bzg6Mz',
        note: 'Dùng ở bàn mod stab và bàn lube; thuộc Ultimate Interior Props Pack',
      },
      {
        what: 'Jar candle (hũ mỡ lube)',
        author: 'Innerscene',
        license: 'CC0',
        url: 'https://www.innerscene.com/tools/library/3d-parts/jar-candle-original-interior-decor-c8f3719e',
        note: 'Dùng làm hũ mỡ lube (bỏ bấc, thêm nắp ghi tên mỡ)',
      },
    ],
  },
  {
    title: 'Font chữ',
    items: [
      {
        what: 'Caveat (chữ khắc tay dưới mặt bàn)',
        author: 'The Caveat Project Authors',
        license: 'SIL OFL 1.1',
        url: 'https://github.com/googlefonts/caveat',
        licenseFile: 'Caveat-OFL.txt',
      },
    ],
  },
  {
    title: 'Hiệu ứng âm thanh (CC0)',
    items: [
      {
        what: 'Phím gõ; ratchet vặn vít; tiếng click lắp ráp; bóc băng keo và bao bì',
        author: 'Nhiều tác giả qua CC0 Sounds',
        license: 'CC0',
        url: 'https://cc0-sounds.exi.software/',
        note: 'Nguồn và danh sách file ở public/audio/README.md',
      },
    ],
  },
  {
    title: 'Nhạc nền (CC0)',
    items: [
      {
        what: 'Coffee House Bump (loop jazz instrumental)',
        author: 'OatCog',
        license: 'CC0',
        url: 'https://opengameart.org/content/coffee-house-bump',
        note: 'WAV nguồn đã chuyển sang MP3 160 kbps để làm nhạc nền game',
      },
      {
        what: 'Chill lofi inspired (bgm-2.mp3)',
        author: 'omfgdude',
        license: 'CC0',
        url: 'https://opengameart.org/content/chill-lofi-inspired',
        note: 'Chuyển MP3 160 kbps, hạ âm lượng cho đều với bài khác',
      },
      {
        what: 'A cup of tea (bgm-3.mp3, trong bộ lofi Compilation)',
        author: 'TAD',
        license: 'CC0',
        url: 'https://opengameart.org/content/lofi-compilation',
        note: 'Chuyển MP3 160 kbps, hạ âm lượng cho đều với bài khác',
      },
    ],
  },
  {
    title: 'Đồ hàn (bước hàn switch)',
    items: [
      {
        what: 'Soldering Iron 60W Adjustable Temprature (bút hàn 60W)',
        author: 'yarankepang',
        license: 'CC BY 4.0',
        url: 'https://sketchfab.com/3d-models/soldering-iron-60w-adjustable-temprature-a3f97e628e6f49678bc44158767ee31a',
      },
      {
        what: 'Sodering_Iron.obj (trạm hàn + mỏ hàn) · Soldering Brass Sponge Stand (giá bùi nhùi)',
        author: 'Chưa rõ',
        license: 'Chưa rõ',
        url: '',
        note: 'File người chơi tải về, không kèm nguồn / giấy phép: chỉ dùng cá nhân',
      },
    ],
  },
  {
    title: 'Vật tư (ảnh Shopii)',
    items: [
      {
        what: 'Band Aid Box (hộp băng cá nhân Urgo)',
        author: 'Logansryche',
        license: 'CC BY 4.0',
        url: 'https://sketchfab.com/3d-models/band-aid-box-3615be47e39c45fc953e89c5e48a4560',
      },
    ],
  },
]
