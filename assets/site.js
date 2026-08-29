
(function(){
  document.addEventListener("DOMContentLoaded", function(){
    document.querySelectorAll(".menu-toggle").forEach(function(btn){
      var nav = btn.closest(".nav");
      var links = nav && nav.querySelector(".links");
      if(!links) return;
      btn.addEventListener("click", function(){
        var isOpen = links.classList.toggle("open");
        btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
      links.querySelectorAll("a").forEach(function(a){
        a.addEventListener("click", function(){
          links.classList.remove("open");
          btn.setAttribute("aria-expanded","false");
        });
      });
      document.addEventListener("click", function(e){
        if(!nav.contains(e.target)){
          links.classList.remove("open");
          btn.setAttribute("aria-expanded","false");
        }
      });
    });
  });
})();
